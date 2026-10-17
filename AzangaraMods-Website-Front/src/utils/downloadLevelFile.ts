import fetchApi from "./fetchApi";
import errorAlert from "./errorAlert";

// Drafts only download with the token, which a plain link doesn't send
export default async function downloadLevelFile(levelId: string, fileId: string, fileName: string, token: string) {
  try {
    const res = await fetchApi(`/download/level/${levelId}/files/${fileId}?ext=pak`, token);
    if (!res.ok) {
      errorAlert(await res.json());
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName + ".pak";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  } catch {
    alert("The server didn't answer.");
  }
}
