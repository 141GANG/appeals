import AppealApp from './appeal-app';
import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  return <AppealApp signedIn={!!user} signInUrl={chatGPTSignInPath('/?compose=1')} />;
}
