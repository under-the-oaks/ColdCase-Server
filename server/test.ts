import { contentType } from "@std/media-types";
const BASE_PATH = "./public";

const reqHandler = async (req: Request) => {
  const url = new URL(req.url);
  const filePath = BASE_PATH + url.pathname;
  let fileSize;

  console.log(filePath);

  //Errorhandeling
  try {
    fileSize = (await Deno.stat(filePath)).size;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return new Response("File not found", { status: 404 });
    }
    return new Response("Internal server error", { status: 500 });
  }

  // Read the file from the file system
  const body = await Deno.readFile(filePath);

  // Extract the extension to determine the content type
  const ext = filePath.split(".").pop();

  //determin mimeType 
  const mimeType = contentType(ext || "text/plain") ||"application/octet-stream";

  //construct and send response
  return new Response(body, {
    headers: {
      "content-length": fileSize.toString(),
      "Content-Type": mimeType,
    },
  });
};


//start server on port 8080
Deno.serve({ port: 8080 }, reqHandler);
