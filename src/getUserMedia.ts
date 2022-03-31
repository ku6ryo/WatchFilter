
export async function getUserMedia() {
  if (navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: 1280,
        },
        height: {
          ideal: 720,
        }
      },
    })
  } else {
    alert("getUserMedia not supported on your browser!");
  }
}