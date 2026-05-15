export default function errorAlert(error: ErrorResponse) {
    alert("Error: " + error.error + "\nError code: " + error.errorCode);
}