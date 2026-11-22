/**
 * Contenu des pages légales.
 *
 * Les textes décrivent le comportement réel du logiciel : ce que la
 * plateforme conserve, qui y accède, et ce que l'utilisateur peut faire.
 * Aucun canal de support n'est inventé : la page renvoie vers la page
 * d'accueil et vers l'espace connecté, qui sont les seules destinations
 * réelles de l'application.
 *
 * Les dates de version sont explicites plutôt que dynamiques : une politique
 * qui change de contenu sans changer de date n'est pas vérifiable.
 */

/** Date de la version en vigueur. */
export const LEGAL_VERSION = '2026-11-07';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalPage {
  title: string;
  description: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalPage = {
  title: 'Politique de confidentialité',
  description:
    'Ce que SCHOOL_MANAGE conserve, pourquoi, combien de temps, et les moyens de contrôler vos données.',
  intro:
    'Cette politique décrit le fonctionnement réel de la plateforme. Elle est ' +
    'rédigée pour être lue : chaque affirmation ci-dessous correspond à un ' +
    'comportement observé du logiciel.',
  sections: [
    {
      id: 'responsable',
      title: 'Qui traite les données',
      paragraphs: [
        'SCHOOL_MANAGE est une application de gestion scolaire exploitable par ' +
          'l’établissement qui l’utilise. Dans chaque établissement, ' +
          'l’administrateur de l’école est responsable des traitements décrits ' +
          'ici, pour les familles et le personnel qu’il enregistre.',
        'L’hébergeur technique de la plateforme et le fournisseur de la base ' +
          'de données interviennent pour le compte de l’établissement dans le ' +
          'cadre de leurs contrats respectifs.',
      ],
    },
    {
      id: 'donnees',
      title: 'Données conservées',
      paragraphs: [
        'L’espace parent contient des données directement liées à un élève : ' +
          'identité, classe, notes publiées, présences, frais et règlements, ' +
          'annonces et notifications.',
        'L’espace école et l’espace enseignant contiennent les mêmes types de ' +
          'données pour l’ensemble des élèves de l’établissement, ainsi que ' +
          'les saisies réalisées par le personnel.',
        'Le compte connecté contient l’adresse e-mail et un rôle. Aucune ' +
          'donnée de santé, aucune pièce d’identité et aucune coordonnée ' +
          'bancaire complète ne sont demandées par le logiciel.',
      ],
    },
    {
      id: 'finalite',
      title: 'Pourquoi ces données sont utilisées',
      paragraphs: [
        'Les données servent exclusivement à informer les familles et le ' +
          'personnel sur la scolarité des élèves : résultats, assiduité, ' +
          'frais et communication de l’établissement.',
        'Chaque consultation est enregistrée dans un journal d’audit consultable ' +
          'par l’administration de l’établissement. Ce journal précise qui a ' +
          'accédé à quelle donnée et quand.',
      ],
    },
    {
      id: 'acces',
      title: 'Qui accède à quoi',
      paragraphs: [
        'L’accès est encadré par la base de données elle-même : chaque ligne ' +
          'n’est lisible que par les rôles et les établissements autorisés. ' +
          'Un parent ne voit que les enfants qui lui sont rattachés dans son ' +
          'propre établissement ; il ne voit jamais un autre parent, ni un autre ' +
          'établissement.',
        'Les notes ne deviennent visibles pour une famille qu’une fois publiées par ' +
          'l’établissement. Les brouillons restent invisibles.',
        'Les opérations d’écriture sont réservées aux rôles habilités et ' +
          'attribuées à un auteur identifié.',
      ],
    },
    {
      id: 'conservation',
      title: 'Durée de conservation',
      paragraphs: [
        'Les données scolaires sont conservées pendant la durée de la scolarité ' +
          'de l’élève, puis selon les obligations propres à l’établissement. ' +
          'La suppression des données relève de l’établissement, qui reste ' +
          'seul juge de la règle qui lui est applicable.',
        'Le journal d’audit conserve les traces des accès et des actions. Sa ' +
          'durée de conservation suit la politique de l’établissement.',
        'Une session de connexion expirée devient inutilisable. Les données ' +
          'de session ne sont pas mises en cache par l’application : recharger ' +
          'la page ne restitue aucun contenu privé.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies et mesure d’audience',
      paragraphs: [
        'L’application dépose un cookie de session indispensable au ' +
          'fonctionnement du compte connecté. Ce cookie est strictement ' +
          'nécessaire : sans lui, la session ne peut pas être reconnue.',
        'Aucun cookie publicitaire, aucun traqueur tiers et aucun service ' +
          'd’analyse n’est déposé par défaut. Si une mesure d’audience est ' +
          'activée, elle ne l’est qu’après consentement explicite, et elle ' +
          'reste désactivée tant que ce consentement n’a pas été donné.',
        'Le bandeau de consentement permet de retirer ce consentement à tout ' +
          'moment.',
      ],
    },
    {
      id: 'droits',
      title: 'Vos droits',
      paragraphs: [
        'Vous pouvez accéder aux données vous concernant, demander leur ' +
          'rectification ou leur suppression, et vous opposer à leur ' +
          'utilisation, en vous adressant à l’établissement qui utilise la ' +
          'plateforme : il en est le responsable et dispose de vos données.',
        'Vous pouvez à tout moment révoquer le consentement donné dans le ' +
          'bandeau de cookies, ce qui désactive la mesure d’audience.',
        'La plateforme ne vérifie pas seule votre identité : c’est ' +
          'l’établissement qui vous a remis vos identifiants qui en reste ' +
          'l’interlocuteur, et lui seul peut y apporter une correction.',
      ],
    },
    {
      id: 'securite',
      title: 'Sécurité',
      paragraphs: [
        'Le transport est chiffré. L’accès aux données est filtré côté base ' +
          'de données, à chaque requête, et non seulement dans l’interface.',
        'Les opérations sensibles sont journalisées. Les secrets de la ' +
          'plateforme ne sont jamais livrés au navigateur : seule une clé ' +
          'publique, limitée à la lecture, est transmise au client.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalPage = {
  title: 'Conditions générales d’utilisation',
  description:
    'Les règles d’utilisation de SCHOOL_MANAGE : accès, usage autorisé, responsabilités et évolution du service.',
  intro:
    'Ces conditions décrivent les règles d’utilisation de la plateforme. ' +
    'Elles s’appliquent à toute personne utilisant un espace SCHOOL_MANAGE, ' +
    'qu’elle soit membre du personnel, parent ou élève.',
  sections: [
    {
      id: 'objet',
      title: 'Objet du service',
      paragraphs: [
        'SCHOOL_MANAGE est une application de gestion scolaire destinée aux ' +
          'établissements. Elle centralise les résultats, l’assiduité, les ' +
          'frais, les règlements et les communications de l’établissement, et ' +
          'les rend consultables aux personnes habilitées.',
        'L’application ne remplace pas le registre scolaire officiel de ' +
          'l’établissement, qui reste la référence.',
      ],
    },
    {
      id: 'acces',
      title: 'Accès au service',
      paragraphs: [
        'L’accès se fait avec les identifiants fournis par l’établissement. ' +
          'Les identifiants sont personnels : ils ne doivent être ni partagés ' +
          'ni transmis. Toute personne qui constate un usage non autorisé de ' +
          'son compte doit en informer l’établissement sans délai.',
        'Un compte peut être désactivé par l’établissement : l’accès est alors ' +
          'interrompu et les données ne sont plus consultables.',
      ],
    },
    {
      id: 'usage',
      title: 'Usage autorisé',
      paragraphs: [
        'Chaque utilisateur ne consulte que les données auxquelles son rôle ' +
          'et son établissement l’autorisent. Toute tentative de consultation ' +
          'en dehors de ce périmètre, toute extraction massive de données et ' +
          'toute tentative de contournement des règles d’accès sont ' +
          'interdites.',
        'Les fonctions d’écriture sont réservées aux rôles habilités. Les ' +
          'saisies réalisées sont attribuées à leur auteur et consignées dans ' +
          'un journal d’audit.',
      ],
    },
    {
      id: 'responsabilite',
      title: 'Responsabilités',
      paragraphs: [
        'L’établissement qui utilise la plateforme est responsable de ' +
          'l’exactitude des informations qu’il saisit, de l’information des ' +
          'familles et de la conservation des données.',
        'L’utilisateur s’engage à ne pas publier de contenu injurieux, ' +
          'diffamatoire ou contraire à la loi, et à ne pas utiliser le service ' +
          'pour un autre usage que celui pour lequel il a été fourni.',
        'L’application est fournie telle quelle : le service peut être ' +
          'interrompu pour maintenance ou mise à jour.',
      ],
    },
    {
      id: 'propriete',
      title: 'Propriété intellectuelle',
      paragraphs: [
        'Le nom, le logo, l’interface et le code de la plateforme appartiennent ' +
          'à leur titulaire. L’utilisation des maquettes et des illustrations ' +
          'présentées sur le site public est autorisée pour comprendre le ' +
          'fonctionnement du produit.',
        'Les données saisies par les établissements et les familles restent la ' +
          'propriété de l’établissement concerné.',
      ],
    },
    {
      id: 'donnees',
      title: 'Données personnelles',
      paragraphs: [
        'Le traitement des données personnelles est décrit dans la politique ' +
          'de confidentialité, qui fait partie des présentes conditions.',
        'Toute demande relative à vos données doit être adressée à ' +
          'l’établissement qui vous a remis vos accès.',
      ],
    },
    {
      id: 'evolution',
      title: 'Évolution du service',
      paragraphs: [
        'Les fonctionnalités, l’interface et les règles d’accès peuvent ' +
          'évoluer. Les parents et le personnel sont informés des changements ' +
          'qui modifient l’usage du service.',
        'La version en vigueur des présentes conditions est indiquée en bas de ' +
          'page. Les modifications importantes sont signalées dans l’espace ' +
          'de connexion.',
      ],
    },
    {
      id: 'contact',
      title: 'Contacter l’établissement',
      paragraphs: [
        'Pour toute question relative à ces conditions, à vos données ou à ' +
          'votre compte, adressez-vous à l’établissement qui vous a remis vos ' +
          'identifiants : il est votre interlocuteur et dispose de vos ' +
          'coordonnées.',
      ],
    },
  ],
};
