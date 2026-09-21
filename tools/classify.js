/**
 * Maps Z-Anatomy structure names onto the parts this site renders.
 *
 * Rules are evaluated in order and the first match wins, so narrow patterns
 * must come before broad ones. `drop` discards a structure entirely: Z-Anatomy
 * ships label anchors, cross-section planes and a few microscopic structures
 * (retinal capillaries, lens zonules) that cost more triangles than the whole
 * skeleton and are never visible at body scale.
 */

export const SOURCES = {
  regions: "Regions of human body100.fbx",
  visceral: "VisceralSystem100.fbx",
  lymphoid: "LymphoidOrgans100.fbx",
  cardio: "CardioVascular41.fbx",
  nervous: "NervousSystem100.fbx",
};

const DROP_ALL = [/^Cross_Section/i, /j$/];

export const RULES = {
  regions: [
    { drop: /Pubic_hairs|Anal_region|Urogenital_region/i },
    { id: "hair", label: "Hair", layer: "skin", systems: ["integumentary"], color: 0x2b211c, test: /Hairs?_of|Eyelashes/i },
    { id: "nails", label: "Nails", layer: "skin", systems: ["integumentary"], color: 0xe9cbbb, test: /Nail_plate|Perionyx/i },
    { id: "skin", label: "Skin", layer: "skin", systems: ["integumentary"], color: 0xd9a781, test: /./ },
  ],

  visceral: [
    { drop: /penis|Glans|corpus_cavernosum|corpus_spongiosum|Testis|Epididymis|Ductus_deferens|Ejaculatory|Seminal_gland|Prostate|Scrotum/i },

    { id: "thyroid", label: "Thyroid & parathyroid glands", layer: "organs", systems: ["endocrine"], color: 0xb2564a, test: /Thyroid_gland|parathyroid/i },
    { id: "adrenal", label: "Adrenal glands", layer: "organs", systems: ["endocrine"], color: 0xd9bf82, test: /Suprarenal/i },
    { id: "pituitary", label: "Pituitary & pineal glands", layer: "organs", systems: ["endocrine", "nervous"], color: 0xc08fa8, test: /Pineal|hypophysis/i },

    { id: "lungs", label: "Lungs", layer: "organs", systems: ["respiratory"], color: 0xd08b8b, test: /lung/i },
    { id: "airway", label: "Trachea & bronchi", layer: "organs", systems: ["respiratory"], color: 0xc3d3da, test: /bronch|Trachea|Epiglottis|Larynx|nasal_cavity|Nose/i },
    { id: "pleura", label: "Pleura", layer: "organs", systems: ["respiratory"], color: 0xdcdcd2, opacity: 0.35, test: /Pleura/i },
    { id: "pharynx", label: "Pharynx", layer: "organs", systems: ["respiratory", "digestive"], color: 0xc98f7a, test: /pharynx|Fauces/i },

    { id: "kidneys", label: "Kidneys", layer: "organs", systems: ["urinary", "endocrine"], color: 0x9c4a3f, test: /Kidney|Renal_pelvis/i },
    { id: "urinary-tract", label: "Ureters, bladder & urethra", layer: "organs", systems: ["urinary"], color: 0xd6c48f, test: /Ureter|Urethra|Urinary_bladder/i },

    { id: "liver", label: "Liver", layer: "organs", systems: ["digestive"], color: 0x8c4a3a, test: /liver/i },
    { id: "biliary", label: "Gallbladder & bile ducts", layer: "organs", systems: ["digestive"], color: 0x7d9e46, test: /Gallbladder|Bile_duct/i },
    { id: "pancreas", label: "Pancreas", layer: "organs", systems: ["digestive", "endocrine"], color: 0xd9b478, test: /Pancrea/i },
    { id: "stomach", label: "Stomach", layer: "organs", systems: ["digestive"], color: 0xc98a68, test: /Stomach/i },
    { id: "intestines", label: "Intestines", layer: "organs", systems: ["digestive"], color: 0xd59a72, test: /colon|intestine|Jejunum|Duodenum|appendix|taenia/i },
    { id: "mouth", label: "Mouth, tongue & salivary glands", layer: "organs", systems: ["digestive"], color: 0xc4766c, test: /Tongue|Gingiva|palate|Uvula|salivary|Parotid|Submandibular|Sublingual/i },
    { id: "oesophagus", label: "Oesophagus", layer: "organs", systems: ["digestive"], color: 0xc98f7a, test: /Oesophagus/i },
    { id: "peritoneum", label: "Peritoneum & omentum", layer: "organs", systems: ["digestive"], color: 0xe0cfa8, opacity: 0.45, test: /Mesocolon|omentum|Meso-appendix|Peritoneum/i },
  ],

  lymphoid: [
    { id: "lymph-organs", label: "Spleen, thymus & tonsils", layer: "organs", systems: ["lymphatic"], color: 0x8e4a6b, test: /Spleen|thymus|tonsil/i },
    { id: "lymph-nodes", label: "Lymph nodes", layer: "organs", systems: ["lymphatic"], color: 0xb9cf72, test: /node/i },
  ],

  cardio: [
    { drop: /Central_retinal_artery/i },
    {
      id: "heart",
      label: "Heart",
      layer: "organs",
      systems: ["cardiovascular"],
      color: 0xa32d2a,
      test: /heart|ventricle|ventricular|atrium|atrial|valve|myocard|pericard|papillary|chordae|Coronary_sinus|Fossa_ovalis|Trabeculae|Crista_terminalis|Auricle_of|Cardiac_skeleton|Endocardium|Sinu-atrial|Atrioventricular/i,
    },
    { id: "lymph-vessels", label: "Lymphatic vessels", layer: "veins", systems: ["lymphatic"], color: 0xb9cf72, test: /lymphatic|Thoracic_duct|Cisterna_chyli/i },
    { id: "veins", label: "Veins", layer: "veins", systems: ["cardiovascular"], color: 0x33559b, test: /vein|venous|cava|azygos|Portal|sinus/i },
    { id: "arteries", label: "Arteries", layer: "veins", systems: ["cardiovascular"], color: 0xbe3a2f, test: /./ },
  ],

  nervous: [
    // Z-Anatomy repeats vessels in this file for context; the cardio file owns them.
    { drop: /arter|aorta|\bvein|venous|Zonular_fibres/i },
    { id: "eyes", label: "Eyes", layer: "organs", systems: ["nervous"], color: 0xf1f0ec, test: /eyeball|retina|lens|cornea|iris|sclera|choroid|vitreous|ciliary_body|pupil|conjunctiva|Optic_disc|Anterior_chamber|Posterior_chamber/i },
    { id: "ears", label: "Ears", layer: "organs", systems: ["nervous"], color: 0xe6d9c8, test: /cochlea|tympan|vestibul|labyrinth|Malleus|Incus|Stapes|Auditory_tube|semicircular/i },
    { id: "spinal-cord", label: "Spinal cord", layer: "organs", systems: ["nervous"], color: 0xe3d3a6, test: /spinal_cord|Spinal_dura|cauda_equina|filum|fasciculus|Conus_medullaris|_of_spinal/i },
    { id: "nerves", label: "Nerves & ganglia", layer: "organs", systems: ["nervous"], color: 0xe8cf72, test: /nerve|plexus|ganglio|ramus|rami|Sympathetic|Parasympathetic|trunk|Chorda_tympani/i },
    { id: "meninges", label: "Meninges", layer: "organs", systems: ["nervous"], color: 0xd8cfc4, opacity: 0.4, test: /dura|arachnoid|pia_mater|falx|tentorium/i },
    { id: "cerebellum", label: "Cerebellum", layer: "organs", systems: ["nervous"], color: 0xc9a09b, test: /cerebell|vermis|flocculus|culmen|declive|folium|tuber|pyramid_of|uvula_of_cerebellum/i },
    { id: "brainstem", label: "Brainstem", layer: "organs", systems: ["nervous"], color: 0xcfa79a, test: /pons|medulla_oblongata|midbrain|mesencephalon|colliculus|Cerebral_peduncle|Olive|Pyramid_of_medulla|tegmentum|substantia_nigra/i },
    { id: "brain", label: "Brain", layer: "organs", systems: ["nervous"], color: 0xd9b2aa, test: /./ },
  ],
};

export function classify(source, name) {
  if (DROP_ALL.some((re) => re.test(name))) return null;
  for (const rule of RULES[source]) {
    if (rule.drop) {
      if (rule.drop.test(name)) return null;
      continue;
    }
    if (rule.test.test(name)) return rule;
  }
  return null;
}

/** Parts sourced from body.glb, which already carries a `type` on every mesh. */
export const GLB_PARTS = {
  bone: { id: "bones", label: "Bones", layer: "bones", systems: ["skeletal"], color: 0xeadfc4 },
  muscle: { id: "muscles", label: "Muscles", layer: "muscles", systems: ["muscular"], color: 0xa33a30 },
};

export const LAYER_ORDER = ["bones", "muscles", "organs", "veins", "skin"];
