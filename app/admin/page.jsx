import { redirect, RedirectType } from "next/navigation";

const Admin = () => {
  redirect("/admin/dashboard", RedirectType.replace);
  return <></>;
};

export default Admin;
