"use client";

import * as React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Ban } from 'lucide-react';

import { cn } from "../../lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../components/ui/navigation-menu";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Contact",
    href: "/contact",
    description: "Contacteer ons voor vragen of opmerkingen over de app",
  },
  {
    title: "FAQ",
    href: "/faq",
    description: "Vind hier de antwoorden op de meest gestelde vragen",
  },
  {
    title: "Handleiding",
    href: "/handleiding",
    description: "Lees de handleiding voor een uitgebreide uitleg van de app",
  },
];

export function Nav() {
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between py-4 mb-8">
      <div className="flex items-center space-x-8">
        
        <div className="flex items-center space-x-4">
          <NavigationMenu className="mb-6">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <ListItem onClick={() => router.push('/home')} title="Home">
                      Overzicht van de zaalindeling
                    </ListItem>
                    <ListItem onClick={() => router.push('/control')} title="Beheer">
                      Beheer alle gasten en hun gegevens
                    </ListItem>
                    <ListItem onClick={() => router.push('/settings')} title="Instellingen">
                      Configureer de zaalindeling en andere instellingen
                    </ListItem>
                    <ListItem onClick={() => router.push('/addUser')} title="Toevoegen">
                      Voeg nieuwe gasten toe
                    </ListItem>
                    <ListItem onClick={() => router.push('/import')} title="Importeren">
                      Importeer gasten via Excel
                    </ListItem>
                    <ListItem onClick={() => router.push('/algorithm-logs')} title="Algoritme Logs">
                      Bekijk hoe het algoritme plaatsen toewijst
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Help</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {components.map((component) => (
                      <ListItem
                        key={component.title}
                        title={component.title}
                        onClick={() => router.push(component.href)}
                      >
                        {component.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
    </nav>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { onClick?: () => void }
>(({ className, title, children, onClick, ...props }, ref) => {
  return (
    <li>
      <a
        onClick={onClick}
        className={cn(
          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer",
          className
        )}
        {...props}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {children}
        </p>
      </a>
    </li>
  );
});
ListItem.displayName = "ListItem";
