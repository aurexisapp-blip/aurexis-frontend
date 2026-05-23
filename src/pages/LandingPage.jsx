import Landing from "../Landing";
export default function LandingPage() {
  return <Landing onGetStarted={() => window.location.href = "/waitlist"} />;
}
