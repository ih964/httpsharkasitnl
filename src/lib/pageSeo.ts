export type PageSeoOptions = {
  title: string;
  description: string;
};

export const applyPageSeo = ({ title, description }: PageSeoOptions) => {
  document.title = title;

  const descriptionTags = Array.from(document.getElementsByTagName("meta")).filter(
    (tag) => tag.getAttribute("name") === "description"
  );

  descriptionTags.forEach((tag) => {
    tag.setAttribute("content", description);
  });
};
