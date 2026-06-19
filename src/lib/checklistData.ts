export interface ChecklistSection {
  id: string;
  title: string;
  icon: string; // nombre del icono de @tabler/icons-react
  items: string[];
}

export const checklistSections: ChecklistSection[] = [
  {
    id: 'dormitorios',
    title: 'Dormitorios',
    icon: 'bed',
    items: [
      'Aberturas bien cerradas; llaves en su lugar',
      'Cortinas (tener sumo cuidado que no queden enganchadas)',
      'Ropa de cama y toallas en lugar correspondiente',
      'Acomodar bien las frazadas de lana, bien dobladas',
      'Llevarse toda la basura',
      'Chequear placards y mesas que no se olviden nada',
      'Apagar todas las luces',
      'Controles de aire acondicionado en cada mesa de luz',
    ],
  },
  {
    id: 'banos',
    title: 'Baños',
    icon: 'bath',
    items: [
      'Aberturas bien cerradas',
      'Basura de baños',
      'Canillas bien cerradas',
      'Chequear pérdidas de agua de los baños',
      'Pelos en los desagües de las duchas',
    ],
  },
  {
    id: 'living',
    title: 'Living, Playroom y Galerías',
    icon: 'armchair',
    items: [
      'Aberturas bien cerradas; llaves en su lugar',
      'Cortinas (tener sumo cuidado que no queden enganchadas)',
      'Cerrar bien los postigos',
      'Que no queden BRASAS encendidas en la chimenea ni en la parrilla',
      'Recoger migas encima y bajo las mesas (barrer)',
      'Acomodar las mantas de los sillones prolijamente en el canasto',
      'Controles de aires acondicionado en los lugares asignados',
      'Controlar las luces de adentro y del exterior',
      'APAGAR CALEFACCIÓN',
    ],
  },
  {
    id: 'cocina',
    title: 'Cocina',
    icon: 'kitchen',
    items: [
      'Heladera: especial atención que no se haya derramado sangre de carne',
      'Llevarse comida perecedera — NO DEJAR en despensas ni en heladera',
      'Juguera y licuadora (revisar que no quede pulpa en el colador)',
      'Lechera eléctrica (limpiarla quitando el mini batidor imantado)',
      'Cafeteras limpias. NO acumular las cápsulas: reciclar o tirarlas (sin líquido) a la basura',
      'Termos bien vacíos (que no quede agua en el fondo, se hacen hongos)',
      'Basura: llevarla y chequear que no haya RESTOS DE LÍQUIDOS derramados en el tacho',
      'Lavavajillas vacío / si no, avisar',
      'No guardar manteles y repasadores usados',
      'Pisos, mesadas y pileta libres de residuos (especialmente la rejilla de la pileta)',
      'Luces exteriores',
    ],
  },
  {
    id: 'lavadero',
    title: 'Lavadero',
    icon: 'shirt',
    items: [
      'Si se deja ropa para lavar, que quede ordenada en su tacho y avisar a Eugenia',
      'Llevarse basura reciclable',
      'Trapos escurridos y, si se dejan en remojo, avisar',
      'Puerta del lavarropas abierta',
      'Mesada limpia y vacía (suelen apoyar las compras, la carne y los zapatos con barro)',
    ],
  },
  {
    id: 'otros',
    title: 'Otros',
    icon: 'bike',
    items: [
      'Bicicletas en el GALPÓN y sin barro',
      'Galpón: cerrados los tachos de comida para gallinas (roedores)',
      'Monturero: respetar el orden y las instrucciones de todo',
    ],
  },
];

export const checklistQuotes = [
  {
    text: '"El orden no es solo una cuestión de estética, es una cuestión de eficiencia" (y de respeto)',
    author: 'William Morris',
  },
  {
    text: '"Con orden y tiempo se encuentra el secreto de hacerlo todo, y de hacerlo bien"',
    author: 'Pitágoras',
  },
];

export const totalChecklistItems = checklistSections.reduce(
  (acc, s) => acc + s.items.length,
  0
);
