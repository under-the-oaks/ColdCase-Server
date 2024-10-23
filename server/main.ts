const handler = async (_req: Request): Promise<Response> => {
  try {
    // Read the contents of the index.html file
    const file = await Deno.readFile("index.html");

    // Return the HTML content with a response
    return new Response(file, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    // Handle errors, like if the file is not found
    return new Response("Error: File not found", { status: 404 });
  }
};

// Serve on port 4242
Deno.serve({ port: 4242 }, handler);