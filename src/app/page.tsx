import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle2,
  Users,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Navbar / Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Image src="/logo.svg" alt="Texte Logo" width={32} height={32} className="w-8 h-8" />
            Texte
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div
            className="absolute inset-0 z-0 opacity-10 dark:opacity-20"
            style={{
              backgroundImage: "url('/subscription-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <Badge className="mb-4" variant="secondary">
              V 1.0.0 Now Available
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-balance max-w-4xl">
              All-in-one workspace for <span className="text-primary">high-performance teams</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl text-balance">
              Manage projects, collaborate in real-time, document knowledge, and track progress—all in one beautiful interface.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Hero Image Mockup (Placeholder for now) */}
            <div className="mt-16 rounded-xl border bg-background/50 p-2 shadow-2xl backdrop-blur-sm lg:mt-24 w-full max-w-5xl">
              <div className="aspect-video w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <LayoutDashboard className="h-24 w-24 opacity-20" />
                </div>
                <Image
                  src="/subscription-bg.png"
                  alt="App Dashboard"
                  fill
                  className="object-cover opacity-80 mix-blend-overlay"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24 space-y-24">

          {/* Project Management */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Layers className="h-4 w-4" /> Project Management
              </div>
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Visualize your workflow with Kanban & Gantt
              </h2>
              <p className="text-lg text-muted-foreground">
                Take control of your tasks with flexible views. track dependencies, manage timelines, and ensure your team stays on track with powerful project management tools.
              </p>
              <ul className="space-y-3">
                {[
                  "Drag-and-drop Kanban boards",
                  "Interactive Gantt charts for timelines",
                  "Task dependencies and milestones",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
                <BarChart3 className="h-32 w-32 text-muted-foreground/20" />
              </CardContent>
            </Card>
          </div>

          {/* Collaboration */}
          <div className="grid lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
            <Card className="bg-muted/50 lg:order-2">
              <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
                <MessageSquare className="h-32 w-32 text-muted-foreground/20" />
              </CardContent>
            </Card>
            <div className="space-y-6 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <Users className="h-4 w-4" /> Collaboration
              </div>
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Real-time communication built-in
              </h2>
              <p className="text-lg text-muted-foreground">
                No need to switch apps. Discuss tasks, share updates, and collaborate on documents directly within your workspace with integrated chat and messaging.
              </p>
              <ul className="space-y-3">
                {[
                  "Direct messaging and group channels",
                  "Threaded conversations on tasks",
                  "Real-time notifications",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Knowledge Base */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <FileText className="h-4 w-4" /> Knowledge Base
              </div>
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Document everything, find anything
              </h2>
              <p className="text-lg text-muted-foreground">
                Create a central repository for your team&apos;s knowledge. Write beautiful documents with a rich text editor and organize them hierarchically.
              </p>
              <ul className="space-y-3">
                {[
                  "Block-based rich text editor",
                  "Hierarchical document organization",
                  "Real-time collaborative editing",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
                <FileText className="h-32 w-32 text-muted-foreground/20" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Resources Grid */}
        <section className="bg-muted/30 py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to ship faster</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Explore the powerful modules available in Texte</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Analytics",
                  description: "Track team performance with detailed monthly reports and insights.",
                  icon: BarChart3
                },
                {
                  title: "Admin Control",
                  description: "Manage users, roles, and permissions with granular access control.",
                  icon: Settings
                },
                {
                  title: "Team Management",
                  description: "Organize teams and departments to mirror your organization structure.",
                  icon: Users
                },
                {
                  title: "Secure",
                  description: "Enterprise-grade security with role-based access control.",
                  icon: CheckCircle2
                },
                {
                  title: "Customizable",
                  description: "Adapt the workspace to fit your specific workflow needs.",
                  icon: Layers
                },
                {
                  title: "Cloud Sync",
                  description: "Access your data from anywhere, always in sync.",
                  icon: LayoutDashboard
                }
              ].map((feature) => (
                <Card key={feature.title} className="bg-background border-none shadow-sm">
                  <CardHeader>
                    <feature.icon className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-primary px-6 py-16 sm:px-12 sm:py-24 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl mb-6">
                Ready to transform your workflow?
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80 mb-10">
                Join thousands of teams who have switched to Texte for better focus and collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary font-bold">
                    Get Started for Free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Image src="/logo.svg" alt="Texte Logo" width={24} height={24} className="w-6 h-6" />
            Texte
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Texte Inc. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Twitter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
