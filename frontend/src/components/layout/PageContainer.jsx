function PageContainer({ children, className = "" }) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-12",
        "text-[15px] leading-relaxed text-slate-800 lg:text-[17px]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default PageContainer;
