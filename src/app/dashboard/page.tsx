import Dashboard from "@/components/Dashboard";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const Page = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser()

  if (!user || !user.id) redirect('/auth-callback?origin=dashboard');
  let dbUser;
  try{
    dbUser = await db.user.findUnique({
      where: {
        id: user?.id,
      },
    });
  } catch(err) {
    console.log(err)
  }

  if (!dbUser) redirect("/auth-callback?origin=dashboard");

  return <Dashboard />;
};

export default Page;
