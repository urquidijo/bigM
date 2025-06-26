import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, BookOpen, Target } from 'lucide-react';

// Componente reutilizable para las tarjetas de método
const MetodoCard = ({ title, description, icon: Icon, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 group"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition-colors">
        <Icon className="w-6 h-6 text-slate-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
    </div>
    <p className="text-slate-600 leading-relaxed mb-4">{description}</p>
    <div className="flex items-center text-slate-500 group-hover:text-slate-700 transition-colors">
      <span className="text-sm font-medium">Resolver problema →</span>
    </div>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Modelación Matemática
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Resuelve problemas de programación lineal con algoritmos avanzados
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="xl:col-span-2 space-y-8">
            {/* Selector de método */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                Métodos Disponibles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetodoCard
                  title="Método Big M"
                  description="Resuelve problemas de programación lineal con variables artificiales usando el método de la Gran M."
                  icon={BookOpen}
                  onClick={() => handleNavigation('/BigM')}
                />

                <MetodoCard
                  title="Método Dos Fases"
                  description="Algoritmo de dos fases para encontrar soluciones óptimas en problemas de programación lineal."
                  icon={Target}
                  onClick={() => handleNavigation('/DosFases')}
                />
              </div>
            </div>

            {/* Características */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Características de los Métodos
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-amber-800">Método Big M</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Maneja restricciones ≥ y =</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Admite coeficientes negativos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Optimización directa</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-amber-800">Método Dos Fases</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Proceso en dos etapas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Mayor precisión numérica</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-semibold">•</span>
                        <span className="text-slate-600">Análisis de factibilidad</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-8">
            {/* Ayuda */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                ¿Cuál elegir?
              </h4>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="font-medium text-emerald-800 mb-1">Big M:</div>
                  <div>Ideal para problemas con restricciones mixtas (≥, =, ≤)</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="font-medium text-slate-700 mb-1">Dos Fases:</div>
                  <div>Mejor para sistemas complejos que requieren análisis detallado</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}