import SvgIcon from "@/components/kit/svgIcon";
import styles from "./footer.module.css";

const links = [
  { label: "Community Discord", href: "https://discord.gg/NWGTsQnHQB" },
  { label: "r/azangara", href: "https://www.reddit.com/r/azangara/" },
  { label: "Speedrun.com", href: "https://www.speedrun.com/azangara" },
  { label: "Azanverse on YouTube", href: "https://www.youtube.com/@Azanverse" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links} aria-label="Community">
        {links.map(link => (
          <a key={link.href} className={styles.link} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}<SvgIcon name="openInNew" size={14}/>
          </a>
        ))}
      </nav>
      <p className={styles.disclaimer}>
        Azangara Mods is an unofficial fan project. It is not affiliated with or approved by Axysoft.
        Azangara is a property of Axysoft.
      </p>
    </footer>
  );
}
