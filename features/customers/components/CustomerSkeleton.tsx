export function CustomerSkeleton() {
  return (
    <div className="customers-skeleton" aria-label="جار تحميل العملاء" aria-busy="true">
      <div className="customers-summary">{Array.from({ length: 4 }, (_, index) => <div className="ui-card customers-summary__card" key={index}><span className="skeleton skeleton--line" /><span className="skeleton skeleton--title" /></div>)}</div>
      <div className="ui-card customers-skeleton__table">{Array.from({ length: 6 }, (_, index) => <span className="skeleton skeleton--line" key={index} />)}</div>
    </div>
  );
}
