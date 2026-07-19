type SectionHeadingProps = {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** Razina naslova. Na SEO landing stranicama glavni naslov mora biti h1. */
  as?: "h1" | "h2";
};

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  as: Tag = "h2"
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`mb-6 flex max-w-3xl flex-col sm:mb-8 lg:mb-10 ${alignment}`}>
      {kicker ? (
        <span className="section-kicker">
          <span className="inline-block h-px w-5 bg-accent" />
          {kicker}
        </span>
      ) : null}
      <Tag className="section-title text-white">{title}</Tag>
      {description ? <p className="section-copy mt-3 sm:mt-4">{description}</p> : null}
    </div>
  );
}
