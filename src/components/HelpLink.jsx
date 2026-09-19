export default function HelpLink({ topic = "application" }) {
  return <a className="troubleshooting-link" href={`#help/${topic}`} aria-label="Learn more about troubleshooting">Learn more</a>;
}

