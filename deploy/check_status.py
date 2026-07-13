import os
import time
from huggingface_hub import HfApi

api = HfApi(token=os.environ.get("HF_TOKEN", ""))

for i in range(8):
    time.sleep(15)
    try:
        rt = api.get_space_runtime("fashionistar/military-pass-frontend")
        print(f"[{i*15+15}s] stage={rt.stage}")
        if rt.stage in ("RUNNING", "BUILD_ERROR", "PAUSED"):
            raw = getattr(rt, "raw", {})
            err = raw.get("errorMessage", "")
            if err:
                print(f"  error: {err[:800]}")
            break
    except Exception as e:
        print(f"[{i*15+15}s] error: {e}")
