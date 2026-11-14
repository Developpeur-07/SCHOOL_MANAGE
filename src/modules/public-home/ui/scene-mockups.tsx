/**
 * Maquettes statiques des écrans de l'espace parent.
 *
 * Ces visuels ne sont pas des captures : ce sont des compositions HTML/CSS
 * construites à partir des mêmes libellés que l'application réelle, afin que
 * la présentation ne diverge pas des écrans affichés après connexion.
 *
 * Les valeurs sont fictives et les mentions correspondantes sont signalées
 * comme telles dans la présentation publique.
 */

import { CalendarCheck, GraduationCap, Megaphone, Wallet } from 'lucide-react';
import { messages } from '@/shared/config/messages';
import { formatMinorAmount } from '@/shared/format/money';

const CURRENCY = 'XAF';

interface SceneFrameProps {
  titre: string;
  children: React.ReactNode;
}

function SceneFrame({ titre, children }: SceneFrameProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-slate-300" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-slate-300" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-slate-300" />
        <span className="ml-1 truncate text-xs font-semibold text-slate-600">{titre}</span>
      </div>
      <div className="space-y-2.5 p-3">{children}</div>
    </div>
  );
}

function Ligne({
  label,
  value,
  icone,
}: {
  label: string;
  value: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
      <span className="shrink-0 rounded-lg bg-teal-50 p-1.5 text-teal-800">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-slate-950">{value}</span>
      </span>
    </div>
  );
}

/** Scène « Résumé » : les indicateurs condensés de l'espace parent. */
function SceneResume() {
  return (
    <SceneFrame titre={messages.parent.tabs.resume}>
      <Ligne
        label={messages.parent.resume.average}
        value="14,5 / 20"
        icone={<GraduationCap aria-hidden="true" className="size-4" />}
      />
      <Ligne
        label={messages.parent.resume.presenceRate}
        value="92 %"
        icone={<CalendarCheck aria-hidden="true" className="size-4" />}
      />
      <Ligne
        label={messages.parent.resume.balance}
        value={formatMinorAmount(30000, CURRENCY)}
        icone={<Wallet aria-hidden="true" className="size-4" />}
      />
    </SceneFrame>
  );
}

/** Scène « Résultats » : les notes par matière et la moyenne générale. */
function SceneResultats() {
  return (
    <SceneFrame titre={messages.parent.tabs.resultats}>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold text-slate-500">
          {messages.parent.results.average}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold text-slate-950">14,5 / 20</p>
      </div>
      <ul className="space-y-1.5">
        {['Mathématiques', 'Français', 'Lecture'].map((matiere, index) => (
          <li
            key={matiere}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="truncate text-sm font-semibold text-slate-800">{matiere}</span>
            <span className="shrink-0 text-sm font-bold text-teal-800">
              {messages.parent.results.subjectAverage} : {['16', '14', '13,5'][index]} / 20
            </span>
          </li>
        ))}
      </ul>
    </SceneFrame>
  );
}

/** Scène « Vie scolaire » : le registre de présence. */
function SceneVieScolaire() {
  const lignes = [
    { date: '06/11/2026', statut: messages.parent.attendance.present, classe: 'text-emerald-700 bg-emerald-50' },
    { date: '05/11/2026', statut: messages.parent.attendance.late, classe: 'text-amber-800 bg-amber-50' },
    { date: '04/11/2026', statut: messages.parent.attendance.absent, classe: 'text-rose-800 bg-rose-50' },
  ];

  return (
    <SceneFrame titre={messages.parent.tabs['vie-scolaire']}>
      <ul className="space-y-1.5">
        {lignes.map((ligne) => (
          <li
            key={ligne.date}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="text-sm font-semibold text-slate-800">{ligne.date}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${ligne.classe}`}
            >
              {ligne.statut}
            </span>
          </li>
        ))}
      </ul>
    </SceneFrame>
  );
}

/** Scène « Paiements » : les frais et le reste à payer. */
function ScenePaiements() {
  return (
    <SceneFrame titre={messages.parent.tabs.paiements}>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
        <p className="text-[11px] font-semibold text-teal-900">
          {messages.parent.payments.balance}
        </p>
        <p className="mt-0.5 text-2xl font-extrabold text-teal-900">
          {formatMinorAmount(30000, CURRENCY)}
        </p>
      </div>
      <ul className="space-y-1.5">
        {[
          { objet: 'Scolarité', statut: messages.parent.payments.status.paid },
          { objet: 'Cantine', statut: messages.parent.payments.status.partial },
        ].map((frais) => (
          <li
            key={frais.objet}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <span className="truncate text-sm font-semibold text-slate-800">{frais.objet}</span>
            <span className="shrink-0 text-xs font-bold text-slate-600">{frais.statut}</span>
          </li>
        ))}
      </ul>
    </SceneFrame>
  );
}

/** Scène « Infos » : les annonces de l'école et les notifications. */
function SceneInfos() {
  return (
    <SceneFrame titre={messages.parent.tabs.infos}>
      <div className="flex gap-3 rounded-xl bg-slate-50 p-2.5">
        <span className="shrink-0 rounded-lg bg-teal-50 p-1.5 text-teal-800">
          <Megaphone aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">Réunion de classe</span>
          <span className="mt-0.5 block text-xs text-slate-600">
            Vendredi à 17 h — salle 204.
          </span>
        </span>
      </div>
      <div className="flex gap-3 rounded-xl bg-slate-50 p-2.5">
        <span className="shrink-0 rounded-lg bg-teal-50 p-1.5 text-teal-800">
          <Wallet aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">Nouvelle facture</span>
          <span className="mt-0.5 block text-xs text-slate-600">
            Une échéance de cantine est disponible.
          </span>
        </span>
      </div>
    </SceneFrame>
  );
}

const SCENE_RENDERS = {
  resume: SceneResume,
  resultats: SceneResultats,
  'vie-scolaire': SceneVieScolaire,
  paiements: ScenePaiements,
  infos: SceneInfos,
} as const;

export type SceneKey = keyof typeof SCENE_RENDERS;

/** Rend la maquette correspondant à une scène du hero. */
export function SceneMockup({ scene }: { scene: SceneKey }) {
  const Renderer = SCENE_RENDERS[scene];
  return <Renderer />;
}
