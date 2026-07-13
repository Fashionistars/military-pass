"""
Military Pass - Memory Pool Optimization for Sub-10ms Latency
==========================================================
Efficient memory management to eliminate allocation overhead:

✅ Pre-allocated tensor pools for GPU memory
✅ Smart memory reuse and recycling
✅ Memory fragmentation prevention
✅ Adaptive pool sizing based on workload
✅ Memory pressure monitoring and management
"""

import torch
import numpy as np
from typing import Dict, List, Optional, Tuple
from collections import deque
import time
import gc


class GPUMemoryPool:
    """
    GPU memory pool for tensor reuse and allocation optimization.
    
    This class manages pre-allocated GPU tensors to eliminate the overhead
    of dynamic memory allocation, which is critical for sub-10ms latency.
    """
    
    def __init__(self, device: torch.device = None, initial_size: int = 10):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.initial_size = initial_size
        self.max_size = initial_size * 4  # Allow growth
        
        # Memory pools organized by tensor shape
        self.pools: Dict[Tuple[int, ...], deque] = {}
        
        # Statistics
        self.allocations = 0
        self.deallocations = 0
        self.pool_hits = 0
        self.pool_misses = 0
        self.total_size = 0
        
        # Memory pressure monitoring
        self.memory_pressure_threshold = 0.8  # 80% GPU memory
        self.current_memory_usage = 0.0
        
        # Initialize pools for common shapes
        self._initialize_common_pools()
    
    def _initialize_common_pools(self):
        """Initialize pools for common tensor shapes used in face processing."""
        common_shapes = [
            (3, 256, 256),    # Face frame
            (3, 512, 512),    # High-res frame
            (1, 3, 256, 256),  # Batch of 1
            (1, 512),         # Embedding
            (1, 1024),        # Large embedding
            (4, 256, 256),    # Batch of 4
        ]
        
        for shape in common_shapes:
            self._create_pool(shape, self.initial_size // len(common_shapes))
    
    def _create_pool(self, shape: Tuple[int, ...], size: int):
        """Create a memory pool for a specific tensor shape."""
        pool = deque(maxlen=size)
        for _ in range(size):
            tensor = torch.empty(shape, dtype=torch.float32, device=self.device)
            pool.append(tensor)
        self.pools[shape] = pool
        self.total_size += size * self._get_tensor_size(shape)
    
    def _get_tensor_size(self, shape: Tuple[int, ...]) -> int:
        """Calculate memory size in bytes for a tensor shape."""
        size = 1
        for dim in shape:
            size *= dim
        return size * 4  # 4 bytes per float32
    
    def get_tensor(self, shape: Tuple[int, ...]) -> torch.Tensor:
        """
        Get a tensor from the pool or allocate new one.
        
        This method first tries to get a tensor from the pool (zero-cost),
        and only allocates new memory if the pool is empty.
        """
        # Try to get from pool
        if shape in self.pools and self.pools[shape]:
            tensor = self.pools[shape].popleft()
            self.pool_hits += 1
            return tensor
        
        # Pool miss - allocate new tensor
        self.pool_misses += 1
        tensor = torch.empty(shape, dtype=torch.float32, device=self.device)
        self.allocations += 1
        self._update_memory_usage()
        
        return tensor
    
    def return_tensor(self, tensor: torch.Tensor):
        """
        Return a tensor to the pool for reuse.
        
        If the pool is full, the tensor is deallocated.
        """
        shape = tuple(tensor.shape)
        
        # Add to pool if not full
        if shape in self.pools and len(self.pools[shape]) < self.pools[shape].maxlen:
            self.pools[shape].append(tensor)
            self.pool_hits += 1
        else:
            # Pool full, deallocate
            del tensor
            torch.cuda.empty_cache()  # Optional: Force cache cleanup
            self.deallocations += 1
            self._update_memory_usage()
    
    def _update_memory_usage(self):
        """Update current memory usage tracking."""
        if torch.cuda.is_available():
            self.current_memory_usage = torch.cuda.memory_allocated() / torch.cuda.get_device_properties(0).total_memory
    
    def get_stats(self) -> Dict:
        """Get memory pool statistics."""
        return {
            "allocations": self.allocations,
            "deallocations": self.deallocations,
            "pool_hits": self.pool_hits,
            "pool_misses": self.pool_misses,
            "hit_rate": self.pool_hits / (self.pool_hits + self.pool_misses) if (self.pool_hits + self.pool_misses) > 0 else 0,
            "total_pools": len(self.pools),
            "total_tensors": sum(len(pool) for pool in self.pools.values()),
            "memory_usage_gb": self.current_memory_usage,
            "memory_pressure": self.current_memory_usage > self.memory_pressure_threshold,
        }
    
    def resize_pool(self, shape: Tuple[int, ...], new_size: int):
        """Resize a specific pool to a new size."""
        if shape not in self.pools:
            self._create_pool(shape, new_size)
            return
        
        current_size = len(self.pools[shape])
        
        if new_size > current_size:
            # Grow pool
            for _ in range(new_size - current_size):
                tensor = torch.empty(shape, dtype=torch.float32, device=self.device)
                self.pools[shape].append(tensor)
        elif new_size < current_size:
            # Shrink pool
            for _ in range(current_size - new_size):
                if self.pools[shape]:
                    tensor = self.pools[shape].pop()
                    del tensor
        
        # Update pool max size
        self.pools[shape] = deque(list(self.pools[shape]), maxlen=new_size)
    
    def shrink_pools(self):
        """Shrink all pools to 50% of current size if memory pressure is high."""
        if self.current_memory_usage > self.memory_pressure_threshold:
            for shape in list(self.pools.keys()):
                current_size = len(self.pools[shape])
                new_size = max(1, current_size // 2)
                self.resize_pool(shape, new_size)
    
    def clear_pool(self, shape: Optional[Tuple[int, ...]] = None):
        """Clear a specific pool or all pools."""
        if shape:
            if shape in self.pools:
                while self.pools[shape]:
                    tensor = self.pools[shape].pop()
                    del tensor
                del self.pools[shape]
        else:
            for shape in list(self.pools.keys()):
                self.clear_pool(shape)
        
        torch.cuda.empty_cache()
        gc.collect()


class FrameBufferPool:
    """
    Specialized pool for frame buffers with efficient reuse.
    
    This class manages frame-specific data structures that are commonly
    reused in the face processing pipeline.
    """
    
    def __init__(self, device: torch.device = None, max_frames: int = 20):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.max_frames = max_frames
        
        # Frame buffer pools
        self.tensor_pool = GPUMemoryPool(self.device, max_frames)
        self.numpy_pool = []  # For CPU-side operations
        self.max_numpy_pool = max_frames
        
        # Frame metadata
        self.frame_metadata = []
    
    def get_frame_tensor(self, shape: Tuple[int, ...] = (3, 256, 256)) -> torch.Tensor:
        """Get a tensor for frame processing."""
        return self.tensor_pool.get_tensor(shape)
    
    def return_frame_tensor(self, tensor: torch.Tensor):
        """Return a frame tensor to the pool."""
        self.tensor_pool.return_tensor(tensor)
    
    def get_frame_numpy(self, shape: Tuple[int, ...] = (256, 256, 3)) -> np.ndarray:
        """Get a numpy array for frame processing."""
        if self.numpy_pool:
            array = self.numpy_pool.pop()
            if array.shape == shape:
                return array
            else:
                del array
        
        # Allocate new numpy array
        return np.zeros(shape, dtype=np.uint8)
    
    def return_frame_numpy(self, array: np.ndarray):
        """Return a numpy array to the pool."""
        if len(self.numpy_pool) < self.max_numpy_pool:
            self.numpy_pool.append(array)
        else:
            del array
    
    def get_stats(self) -> Dict:
        """Get frame buffer pool statistics."""
        return {
            "tensor_pool": self.tensor_pool.get_stats(),
            "numpy_pool_size": len(self.numpy_pool),
            "numpy_pool_max": self.max_numpy_pool,
        }


class EmbeddingCache:
    """
    Cache for face embeddings to avoid repeated extraction.
    
    This class caches frequently used face embeddings to eliminate
    the overhead of repeated feature extraction.
    """
    
    def __init__(self, max_cache_size: int = 1000):
        self.max_cache_size = max_cache_size
        self.cache: Dict[str, List[float]] = {}
        self.access_count: Dict[str, int] = {}
        self.max_size = max_cache_size
        
        # LRU tracking
        self.access_order = deque(maxlen=max_cache_size)
    
    def get(self, cache_key: str) -> Optional[List[float]]:
        """Get cached embedding."""
        if cache_key in self.cache:
            self.access_count[cache_key] = self.access_count.get(cache_key, 0) + 1
            # Update LRU order
            if cache_key in self.access_order:
                self.access_order.remove(cache_key)
                self.access_order.append(cache_key)
            return self.cache[cache_key]
        return None
    
    def set(self, cache_key: str, embedding: List[float]):
        """Cache an embedding."""
        if len(self.cache) >= self.max_size:
            # Evict least recently used
            lru_key = self.access_order.popleft()
            del self.cache[lru_key]
            del self.access_count[lru_key]
        
        self.cache[cache_key] = embedding
        self.access_count[cache_key] = 1
        self.access_order.append(cache_key)
    
    def clear(self):
        """Clear the cache."""
        self.cache.clear()
        self.access_count.clear()
        self.access_order.clear()
    
    def get_stats(self) -> Dict:
        """Get cache statistics."""
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "total_accesses": sum(self.access_count.values()),
            "hit_rate": sum(self.access_count.values()) / (sum(self.access_count.values()) + 1) if self.access_count else 0),
        }


class AdaptiveMemoryManager:
    """
    Adaptive memory manager that automatically adjusts pool sizes
    based on usage patterns and memory pressure.
    
    This class monitors memory usage and automatically adjusts
    pool sizes to maintain optimal performance while preventing
    memory exhaustion.
    """
    
    def __init__(self, device: torch.device = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Memory pools
        self.tensor_pool = GPUMemoryPool(self.device)
        self.frame_buffer = FrameBufferPool(self.device)
        self.embedding_cache = EmbeddingCache()
        
        # Monitoring
        self.monitoring_interval = 60  # seconds
        self.last_monitoring = time.time()
        
        # Memory pressure history
        self.memory_history = deque(maxlen=100)
        
    def monitor_memory(self) -> Dict:
        """Monitor memory usage and adjust pools accordingly."""
        current_time = time.time()
        
        # Only monitor periodically
        if current_time - self.last_monitoring < self.monitoring_interval:
            return self.get_stats()
        
        self.last_monitoring = current_time
        
        # Check memory pressure
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated()
            memory_reserved = torch.cuda.memory_reserved()
            memory_total = torch.cuda.get_device_properties(0).total_memory
            
            memory_pressure = memory_allocated / memory_total
            self.memory_history.append(memory_pressure)
            
            # Adjust pools based on memory pressure
            if memory_pressure > 0.8:
                self._reduce_memory_footprint()
            elif memory_pressure < 0.5:
                self._increase_memory_footprint()
        
        return self.get_stats()
    
    def _reduce_memory_footprint(self):
        """Reduce memory footprint when under pressure."""
        print("[MemoryManager] Reducing memory footprint")
        self.tensor_pool.shrink_pools()
        self.embedding_cache.clear()
        gc.collect()
        torch.cuda.empty_cache()
    
    def _increase_memory_footprint(self):
        """Increase memory footprint when memory is available."""
        print("[MemoryManager] Increasing memory footprint")
        # Increase pool sizes
        for shape in list(self.tensor_pool.pools.keys()):
            current_size = len(self.tensor_pool.pools[shape])
            new_size = min(current_size * 2, self.tensor_pool.max_size)
            self.tensor_pool.resize_pool(shape, new_size)
    
    def get_stats(self) -> Dict:
        """Get comprehensive memory management statistics."""
        return {
            "tensor_pool": self.tensor_pool.get_stats(),
            "frame_buffer": self.frame_buffer.get_stats(),
            "embedding_cache": self.embedding_cache.get_stats(),
            "memory_pressure_history": list(self.memory_history),
            "current_memory_usage": self.tensor_pool.current_memory_usage,
        }
    
    def get_tensor(self, shape: Tuple[int, ...]) -> torch.Tensor:
        """Get tensor from the managed pool."""
        return self.tensor_pool.get_tensor(shape)
    
    def return_tensor(self, tensor: torch.Tensor):
        """Return tensor to the managed pool."""
        self.tensor_pool.return_tensor(tensor)
    
    def get_frame_tensor(self, shape: Tuple[int, ...] = (3, 256, 256)) -> torch.Tensor:
        """Get frame tensor from managed pool."""
        return self.frame_buffer.get_frame_tensor(shape)
    
    def return_frame_tensor(self, tensor: torch.Tensor):
        """Return frame tensor to managed pool."""
        self.frame_buffer.return_frame_tensor(tensor)
    
    def cache_embedding(self, cache_key: str, embedding: List[float]):
        """Cache an embedding."""
        self.embedding_cache.set(cache_key, embedding)
    
    def get_cached_embedding(self, cache_key: str) -> Optional[List[float]]:
        """Get cached embedding."""
        return self.embedding_cache.get(cache_key)


# Singleton instance for global access
_memory_manager: Optional[AdaptiveMemoryManager] = None

def get_memory_manager() -> AdaptiveMemoryManager:
    """Get the global memory manager instance."""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = AdaptiveMemoryManager()
    return _memory_manager


# Context manager for memory-managed operations
@contextmanager
def managed_tensor(shape: Tuple[int, ...]):
    """
    Context manager for automatic memory management.
    
    Usage:
        with managed_tensor((3, 256, 256)) as tensor:
            # Use tensor
            process(tensor)
        # Tensor is automatically returned to pool
    """
    manager = get_memory_manager()
    tensor = manager.get_tensor(shape)
    try:
        yield tensor
    finally:
        manager.return_tensor(tensor)


def benchmark_memory_pool():
    """
    Benchmark memory pool performance vs. dynamic allocation.
    
    This demonstrates the performance benefits of memory pooling
    for achieving sub-10ms latency.
    """
    import torch
    import time
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    print(f"Device: {device}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    
    # Benchmark dynamic allocation
    iterations = 1000
    shape = (3, 256, 256)
    
    # Dynamic allocation benchmark
    start = time.time()
    for _ in range(iterations):
        tensor = torch.empty(shape, dtype=torch.float32, device=device)
        # Simulate processing
        result = torch.matmul(tensor.view(-1, 256*256), tensor.view(-1, 256*256).T)
        del tensor
    dynamic_time = time.time() - start
    
    # Memory pool benchmark
    pool = GPUMemoryPool(device, initial_size=50)
    start = time.time()
    for _ in range(iterations):
        tensor = pool.get_tensor(shape)
        # Simulate processing
        result = torch.matmul(tensor.view(-1, 256*256), tensor.view(-1, 256*256).T)
        pool.return_tensor(tensor)
    pooled_time = time.time() - start
    
    print(f"\nMemory Pool Benchmark (1000 iterations)")
    print(f"Dynamic allocation: {dynamic_time*1000:.2f}ms")
    print(f"Memory pool: {pooled_time*1000:.2f}ms")
    print(f"Speedup: {dynamic_time/pooled_time:.2f}x")
    print(f"Pool stats: {pool.get_stats()}")


if __name__ == "__main__":
    # Run benchmark when executed directly
    benchmark_memory_pool()
