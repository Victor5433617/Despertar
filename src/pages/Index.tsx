import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Users,
  Heart,
  BookOpen,
  Star,
  Shield,
  ArrowRight,
} from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import gallery1 from "@/assets/imagen1.jpg";
import gallery2 from "@/assets/imagen2.jpg";
import gallery3 from "@/assets/imagen3.jpg";
import gallery4 from "@/assets/imagen4.jpg";
import gallery5 from "@/assets/imagen5.jpg";
import gallery6 from "@/assets/imagen6.jpg";
import gallery7 from "@/assets/imagen7.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Educación Integral",
      description:
        "Formación académica de excelencia combinada con desarrollo personal y valores.",
    },
    {
      icon: Heart,
      title: "Ambiente Familiar",
      description:
        "Comunidad cálida donde cada estudiante es valorado y acompañado.",
    },
    {
      icon: Users,
      title: "Docentes Comprometidos",
      description: "Equipo profesional dedicado al crecimiento de cada alumno.",
    },
    {
      icon: Shield,
      title: "Valores Sólidos",
      description:
        "Formamos personas íntegras con principios éticos y sociales.",
    },
  ];

  const stats = [
    { value: "15+", label: "Años de experiencia" },
    { value: "98%", label: "Satisfacción familiar" },
    { value: "13", label: "Docentes especializados" },
  ];

  const galleryImages = [
    { src: gallery1, alt: "Actividad escolar 1" },
    { src: gallery2, alt: "Actividad escolar 2" },
    { src: gallery3, alt: "Actividad escolar 3" },
    { src: gallery4, alt: "Actividad escolar 4" },
    { src: gallery5, alt: "Actividad escolar 5" },
    { src: gallery6, alt: "Actividad escolar 6" },
    { src: gallery7, alt: "Actividad escolar 7" },
  ];

  const [currentImage, setCurrentImage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || galleryImages.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % galleryImages.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [isPaused, galleryImages.length]);

  const goToPrevious = () => {
    setCurrentImage(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  const goToNext = () => {
    setCurrentImage((prev) => (prev + 1) % galleryImages.length);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden lg:min-h-[85vh]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
          <div className="absolute -top-24 left-[-10%] h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-primary/20 blur-3xl float-slower" />
          <div className="absolute bottom-[-20%] right-[-10%] h-80 w-80 sm:h-96 sm:w-96 rounded-full bg-accent/20 blur-3xl float-slow" />
          <div className="absolute left-1/2 top-12 h-24 w-[70%] -translate-x-1/2 -rotate-2 rounded-[40px] bg-gradient-to-r from-primary/15 via-accent/10 to-transparent blur-2xl" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,hsl(var(--foreground)_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)_/_0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={schoolLogo}
              alt=""
              aria-hidden="true"
              className="w-[320px] opacity-10 sm:w-[420px] lg:w-[560px] pointer-events-none select-none"
            />
          </div>
        </div>
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-32 relative">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] items-center gap-12 lg:gap-16">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium shadow-sm border border-primary/10 backdrop-blur">
                <Star className="h-4 w-4" />
                Educación que transforma vidas
              </div>
              <div className="relative inline-block">
                <span className="absolute -bottom-3 left-0 h-3 w-full rounded-full bg-accent/30 blur-lg" />
                <h1 className="relative text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
                  Escuela{" "}
                  <span className="bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
                    Despertar
                  </span>
                </h1>
              </div>
              <p className="text-lg sm:text-2xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
                La educación es la base principal para{" "}
                <span className="font-semibold text-foreground">Despertar</span>{" "}
                y{" "}
                <span className="font-semibold text-foreground">Mejorar</span>{" "}
                la Sociedad.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:from-primary/90 hover:to-accent/90"
                >
                  Iniciar Sesión
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-2 shadow-md border border-border/60 backdrop-blur">
                  <Shield className="h-4 w-4 text-primary" />
                  Acompañamiento cercano
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-2 shadow-md border border-border/60 backdrop-blur">
                  <Heart className="h-4 w-4 text-accent" />
                  Comunidad que cuida
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-2 shadow-md border border-border/60 backdrop-blur">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Excelencia académica
                </div>
              </div>
            </div>

            {/* Right - Gallery Carousel */}
            <div
              className="flex-shrink-0 w-full"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative">
                <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
                <div className="relative rounded-[28px] p-[1px] bg-gradient-to-br from-primary/45 via-accent/35 to-transparent shadow-2xl">
                  <div className="relative overflow-hidden rounded-[27px] bg-card/80 backdrop-blur min-h-[280px] sm:min-h-[360px] lg:min-h-[520px]">
                    <img
                      src={galleryImages[currentImage].src}
                      alt={galleryImages[currentImage].alt}
                      className="h-full w-full object-cover aspect-[4/3] lg:aspect-[5/4]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent" />
                    <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
                      {galleryImages[currentImage].alt}
                    </div>
                    <div className="absolute top-4 right-4 rounded-2xl bg-white/85 px-3 py-2 backdrop-blur">
                      <img
                        src={schoolLogo}
                        alt="Logo Escuela Despertar"
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur hover:bg-black/60"
                  aria-label="Foto anterior"
                >
                  <ArrowRight className="h-5 w-5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur hover:bg-black/60"
                  aria-label="Foto siguiente"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-5 sm:grid-cols-7 gap-2">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.alt}-${index}`}
                    type="button"
                    onClick={() => setCurrentImage(index)}
                    className={`group relative overflow-hidden rounded-xl border transition ${
                      index === currentImage
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border/70 hover:border-primary/50"
                    }`}
                    aria-label={`Ver ${image.alt}`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-full w-full object-cover aspect-[4/3] transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Sobre Nosotros
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              La Escuela Básica N 5974 “Privada Despertar” es una institución
              educativa de carácter privado, ubicadas en el Barrio San José, al
              sur de Ciudad del Este, en la región del Alto Paraná. Forma parte
              del Área Educativa 10-08 y fue fundada en el año 2001, mediante la
              Resolución Ministerial N 270-06/07/2001. Desde sus inicios, se ha
              dedicado a la educación de niños, niñas y adolescentes desde el
              nivel inicial hasta el noveno grado de la Educación Escolar
              Básica, funcionando en los turnos mañana y tarde.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Su Misión Institucional es brindar servicios educativos de
              calidad, promoviendo la participación real de los niños, niñas y
              adolescentes como protagonistas de su propio aprendizaje en un
              ambiente armónico y saludable, donde su vivencia es la práctica
              constante de valores.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              La Escuela Básica N 5974 “Privada Despertar” tiene como Visión que
              los niños, niñas y adolescentes de E.E.B. eleven su nivel
              académico en todas las áreas del saber y promueven las prácticas
              constantes de valores para la buena convivencia en la Institución
              y dentro de la Sociedad y sean capaces de enfrentar y solucionar
              posibles problemas de la vida cotidiana.
            </p>
          </div>
      
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ofrecemos una educación integral que va más allá del aula
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="bg-card border-0 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={schoolLogo}
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
              <span className="font-semibold text-foreground">
                Escuela Despertar
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
               {new Date().getFullYear()} Escuela Despertar. Todos los derechos reservados.              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
