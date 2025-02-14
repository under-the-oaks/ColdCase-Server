![ColdCase Banner](https://github.com/under-the-oaks/ColdCase-Documentation/blob/31e9dddb233c8022a4ec7349e4e7f3ec5c337de6/Design/Sketches/banner.png)

[![Deno CI](https://github.com/under-the-oaks/ColdCase-Server/actions/workflows/deno-tests.yml/badge.svg)](https://github.com/under-the-oaks/ColdCase-Server/actions/workflows/deno-tests.yml)

# ColdCase

A detailed documentation of the specifications, including some tutorials on how to set up the project, can be found [here](https://under-the-oaks.github.io/ColdCase-Documentation/starter-topic.html).
For the technical Javadocs, go [here](https://under-the-oaks.github.io/ColdCase-Client/index.html).

## Prerequesites

- [Deno 2.0](https://deno.com/)

## Cloning the Repository

Clone the GitHub repository to your local machine using Git. Replace the repository URL with the correct one for your project.

```sh
git clone https://github.com/under-the-oaks/ColdCase-Server
dd ColdCase-Server
```

To start the server locally, use the following command:

```sh
cd server
deno run --allow-net --allow-read main.ts
```

Once the server has started, the output should indicate that it is listening on port `8080`.