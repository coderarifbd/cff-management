export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${monthName}-${year}`;
}
