export function PublicHeader() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="bg-white border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <img
          src={`${base}branding/logo_ministerio.png`}
          alt="Ministerio del Poder Popular de Desarrollo Minero Ecológico e Industrias Básicas"
          className="h-12 sm:h-14 w-auto object-contain"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
        <div className="flex-1 text-center">
          <p className="text-[10px] sm:text-xs text-secondary/70 font-medium tracking-widest uppercase">
            Corporación Venezolana de Minería
          </p>
          <h1 className="font-serif text-lg sm:text-xl text-secondary font-semibold leading-tight">
            Registro de Solicitudes de Atención al Ciudadano
          </h1>
        </div>
        <img
          src={`${base}branding/logo_cvm.png`}
          alt="Corporación Venezolana de Minería"
          className="h-12 sm:h-14 w-auto object-contain"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      </div>
    </div>
  );
}
