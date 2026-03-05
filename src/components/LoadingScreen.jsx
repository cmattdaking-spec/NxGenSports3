export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[9999] flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <div className="w-20 h-20 border-2 border-gray-800 border-t-[var(--color-primary,#3b82f6)] rounded-full animate-spin absolute" />
        {/* Logo */}
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a8dea6f5ebfce20bad2a8c/871a00698_image_aaa46895.png"
          alt="NxDown"
          className="w-10 h-10 rounded-lg object-cover"
        />
      </div>
    </div>
  );
}