// Allow importing JSON modules without adding resolveJsonModule to tsconfig
declare module "*.json" {
  const value: any;
  export default value;
}

