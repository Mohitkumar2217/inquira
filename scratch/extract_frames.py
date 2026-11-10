import cv2, os, glob

for mp4 in glob.glob(r"C:\Users\Mohit Kumawat\.gemini\antigravity\brain\48765991-2943-4d64-a06f-8a58d3eca063\.user_uploaded\*.mp4"):
    cap = cv2.VideoCapture(mp4)
    ret, frame = cap.read()
    if ret:
        out_name = os.path.basename(mp4).replace(".mp4", "_frame0.jpg")
        cv2.imwrite(os.path.join("scratch", out_name), frame)
        print("Extracted", out_name, "from", os.path.basename(mp4))
    cap.release()
