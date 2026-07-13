import os
from huggingface_hub import HfApi

api = HfApi(token=os.environ.get("HF_TOKEN", ""))
rt = api.get_space_runtime("fashionistar/military-pass-frontend")
raw = getattr(rt, "raw", {})
err = raw.get("errorMessage", "")
print("FULL ERROR MESSAGE:")
print(err)
