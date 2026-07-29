import serverless from "serverless-http";
import { createApp } from "../app";

const app = createApp();

export default serverless(app);
