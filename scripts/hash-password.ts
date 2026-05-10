import { hashPassword } from "../src/server/auth/credentials.ts";

const password = process.argv[2];
if (!password) {
	console.error("usage: bun run hash-password <password>");
	process.exit(1);
}

hashPassword(password).then((hash) => {
	console.log(hash);
});
