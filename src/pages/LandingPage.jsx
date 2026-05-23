import Landing from "../Landing";
export default function LandingPage() {
  return <Landing onGetStarted={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSfbm7SQuz0LpD4nNHlh6mU639N8FhaRRvsqU5dsWZcCQUHGFA/viewform", "_blank")} />;
}
