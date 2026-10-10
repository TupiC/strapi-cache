import type { Core } from "@strapi/strapi";
import middlewares from "./middlewares";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.server.use(middlewares.cache);
  strapi.server.use(middlewares.graphql);
};

export default register;
