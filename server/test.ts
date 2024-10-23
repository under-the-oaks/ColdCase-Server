import { contentType } from "@std/media-types";
const BASE_PATH = "./public";

const reqHandler = async (req: Request) => {
  const filePath = BASE_PATH + new URL(req.url).pathname;
  let fileSize;

  console.log(filePath);

  try {
    fileSize = (await Deno.stat(filePath)).size;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 500 });
  }
  const body = (await Deno.readFile(filePath));
  return new Response(body, {
    headers: {
      "content-length": fileSize.toString(),
      "Content-Type": "text/html",
    },
  });

  return new Response(file, {
    headers: { "Content-Type": "text/html" },
  });
};

Deno.serve({ port: 8080 },reqHandler);
