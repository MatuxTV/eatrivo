export default function KitchenCounterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-eatrivo-white-primary font-sans text-eatrivo-black-primary selection:bg-eatrivo-purple/20 selection:text-eatrivo-purple">
      {/* We skip the dashboard sidebar and header to give full focus to the cooking experience */}
      {children}
    </div>
  );
}
