#!/usr/bin/env python3

import sys
import json
import base64
from io import BytesIO

try:
    from PIL import Image
    import numpy as np
    from nudenet import NudeDetector
    DEPS_AVAILABLE = True
except ImportError as e:
    DEPS_AVAILABLE = False
    IMPORT_ERROR = str(e)

# Initialize NudeNet detector (loads model once)
detector = None

def init_detector():
    global detector
    if not DEPS_AVAILABLE:
        raise ImportError(f"Required dependencies not available: {IMPORT_ERROR}")
    
    if detector is None:
        detector = NudeDetector()
        print("NudeNet detector initialized", file=sys.stderr)

def check_image_content(image_data_base64):
    """
    Check if image content is appropriate for teen users
    Returns: {"appropriate": bool, "scores": dict, "message": string}
    """
    try:
        init_detector()
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data_base64)
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array for NudeNet
        image_array = np.array(image)
        
        # Run NudeNet detection
        detections = detector.detect(image_array)
        
        # Calculate scores for different content types
        scores = {}
        for detection in detections:
            label = detection['class']
            confidence = detection['score']
            
            if label not in scores:
                scores[label] = 0
            scores[label] = max(scores[label], confidence)
        
        # Teen-safe thresholds (stricter than adult content)
        explicit_threshold = 0.2  # Very strict for explicit content
        suggestive_threshold = 0.3  # Strict for suggestive content
        
        # Check for inappropriate content
        inappropriate_labels = [
            'EXPOSED_ANUS', 'EXPOSED_ARMPITS', 'EXPOSED_BELLY', 'EXPOSED_BUTTOCKS',
            'EXPOSED_BREAST_F', 'EXPOSED_BREAST_M', 'EXPOSED_GENITALIA_F', 
            'EXPOSED_GENITALIA_M', 'EXPOSED_FEET', 'FACE_F', 'FACE_M'
        ]
        
        high_risk_labels = [
            'EXPOSED_ANUS', 'EXPOSED_BUTTOCKS', 'EXPOSED_BREAST_F', 
            'EXPOSED_GENITALIA_F', 'EXPOSED_GENITALIA_M'
        ]
        
        # Check for high-risk content with very strict threshold
        for label in high_risk_labels:
            if scores.get(label, 0) > explicit_threshold:
                return {
                    "appropriate": False,
                    "scores": scores,
                    "message": f"Inappropriate content detected: {label} (confidence: {scores[label]:.2f})"
                }
        
        # Check for moderate-risk content with moderate threshold
        # moderate_risk_labels = ['EXPOSED_ARMPITS', 'EXPOSED_BELLY', 'EXPOSED_FEET']
        # for label in moderate_risk_labels:
        #     if scores.get(label, 0) > suggestive_threshold:
        #         return {
        #             "appropriate": False,
        #             "scores": scores,
        #             "message": f"Suggestive content detected: {label} (confidence: {scores[label]:.2f})"
        #         }
        
        # Content passed all checks
        return {
            "appropriate": True,
            "scores": scores,
            "message": "Content appropriate for teen users"
        }
        
    except Exception as e:
        # If filtering fails, err on the side of caution
        return {
            "appropriate": False,
            "scores": {},
            "message": f"Content filtering error: {str(e)}"
        }

def main():
    """Main function for command-line usage"""
    if len(sys.argv) != 2:
        print(json.dumps({
            "appropriate": False,
            "scores": {},
            "message": "Usage: python content-filter.py <base64_image_data>"
        }))
        sys.exit(1)
    
    image_data = sys.argv[1]
    result = check_image_content(image_data)
    print(json.dumps(result))

if __name__ == "__main__":
    main()