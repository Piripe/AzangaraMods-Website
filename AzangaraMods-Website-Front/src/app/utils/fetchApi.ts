export default function fetchApi(
  path: string,
  token: string,
  method: string = "GET",
  body: BodyInit | null | undefined = null,
  contentType: string|null = "application/json"
) {
  return fetch(process.env.NEXT_PUBLIC_API_URL + path, {
    method: method,
    headers: {
      "Authorization": token,
      ...(contentType != null ? {"Content-Type": contentType} : {})
    },
    body: body,
  });
}
