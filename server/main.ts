import { contentType } from "@std/media-types";
import "jsr:@std/dotenv/load";
import { connect } from 'https://deno.land/x/redis/mod.ts';

// Load environment variables
const redisPassword = Deno.env.get("REDIS_PASSWORD")


//redis connection
const redis = await connect({
  hostname: 'redis.underoaks.tech',
  port: 6379,
  password: redisPassword,
});

//const ok = await redis.set('foo', 'TEST');
//const foo = await redis.get('foo')
//
//console.log(foo);

//Static File serving 
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


