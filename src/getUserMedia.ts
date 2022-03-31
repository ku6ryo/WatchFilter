
export async function getUserMedia() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: window.innerWidth,
        },
        height: {
          ideal: window.innerHeight,
        }
      },
    })
  } else {
    alert("getUserMedia not supported on your browser!");
  }
}