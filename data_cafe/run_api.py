import uvicorn
import os
import sys

if __name__ == "__main__":
    print("🚀 Starting Cafe API Server...")
    print("📂 Documentation will be available at: http://localhost:8000/docs")
    
    # Reload=True depends on watching source files, better for dev
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
