// Same as fetchApi for FormData uploads, but reports upload progress (fetch can't)
export default function uploadApi(
  path: string,
  token: string,
  method: string,
  body: FormData,
  onProgress: (fraction: number) => void = () => {}
) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, process.env.NEXT_PUBLIC_API_URL + path);
    xhr.setRequestHeader("Authorization", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve(new Response([204, 205, 304].includes(xhr.status) ? null : xhr.responseText, {
      status: xhr.status,
      headers: { "Content-Type": xhr.getResponseHeader("Content-Type") ?? "application/json" },
    }));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}
