import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowRight, BookOpen, Target } from 'lucide-react';

// Componente reutilizable para las tarjetas de método
const MetodoCard = ({ title, description, icon: Icon, color, onClick }) => (
  <div
    onClick={onClick}
    className={`group relative bg-gradient-to-br from-${color}-600 to-${color}-800 rounded-3xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-${color}-500/25 border border-${color}-400/20 backdrop-blur-sm`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-400/10 to-transparent rounded-3xl`}></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 bg-${color}-500/20 rounded-2xl`}>
          <Icon className={`w-8 h-8 text-${color}-300`} />
        </div>
        <ArrowRight className={`w-6 h-6 text-${color}-300 group-hover:translate-x-2 transition-transform duration-300`} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className={`text-${color}-100 text-lg leading-relaxed mb-6`}>
        {description}
      </p>
      <div className={`flex items-center text-${color}-300 font-semibold`}>
        <span>Comenzar resolución</span>
        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">

      {/* Fondos decorativos */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Partículas flotantes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`
            }}
          ></div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Calculator className="w-20 h-20 text-white animate-pulse" />
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-30 animate-ping"></div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Modelación Matemática
          </h1>

          <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Resuelve problemas de programación lineal con algoritmos avanzados
          </p>
        </div>

        {/* Tarjetas de métodos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-4xl">
          <MetodoCard
            title="Método Big M"
            description="Resuelve problemas de programación lineal con variables artificiales usando el método de la Gran M."
            icon={BookOpen}
            color="blue"
            onClick={() => handleNavigation('/BigM')}
          />

          <MetodoCard
            title="Método Dos Fases"
            description="Algoritmo de dos fases para encontrar soluciones óptimas en problemas de programación lineal."
            icon={Target}
            color="purple"
            onClick={() => handleNavigation('/DosFases')}
          />
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-lg">
            Selecciona el método que deseas utilizar para resolver tu problema
          </p>
        </div>
      </div>
    </div>
  );
}
