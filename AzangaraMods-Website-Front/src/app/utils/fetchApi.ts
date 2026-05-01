export default function fetchApi(
  path: string,
  token: string,
  method: string = "GET",
  body: BodyInit | null | undefined = null
) {
  return fetch(process.env.NEXT_PUBLIC_API_URL + path, {
    method: method,
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
    },
    body: body,
  });
}
