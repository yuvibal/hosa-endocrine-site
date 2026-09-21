/** Display names and hover-card copy for anatomy meshes. */

export function prettyLabel(name) {
  return String(name || "")
    .replace(/\.\d+$/, "")
    .replace(/(\D)\d{3}$/, "$1")
    .replace(/^\((.*)\)$/, "$1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function describeHover(data, systemLabel) {
  const label = prettyLabel(data.label || "This structure");
  const systems = (data.systems || []).map((id) => systemLabel[id] || id).join(", ");
  const title = systems ? `${label} — ${systems}` : label;
  let body;
  if (data.layer === "bones") body = describeBone(label);
  else if (data.layer === "muscles") body = describeMuscle(label);
  else body = PARTS[data.id] || fallback(label, systems);
  return { title, body };
}

function fallback(label, systems) {
  const where = systems ? ` the ${systems.toLowerCase()} system` : " the body";
  return `${label} works inside${where}. It carries out its job by acting on neighboring tissues, and it coordinates with the other structures of that system so the body can move, protect itself, and keep internal conditions stable.`;
}

function pick(label, rules) {
  const k = label.toLowerCase();
  for (const [re, text] of rules) {
    if (re.test(k)) return typeof text === "function" ? text(label) : text;
  }
  return null;
}

function describeBone(label) {
  return (
    pick(label, BONE_RULES) ||
    `${label} is part of the skeleton. It holds up the bones and soft tissues attached to it and shares load with neighboring bones of the skeletal system.`
  );
}

function describeMuscle(label) {
  return (
    pick(label, MUSCLE_RULES) ||
    `${label} is a skeletal muscle. It produces movement by shortening its fibers and pulling on its bony attachments, and it works with neighboring muscles of the muscular system so that motion is smooth and controlled.`
  );
}

const BONE_RULES = [
  [/atlas/, "The atlas (C1) holds up the skull and lets the head nod on the top of the spine."],
  [/axis \(c2\)|^axis$/, "The axis (C2) holds up the atlas and skull and lets the head rotate."],
  [/^vertebra c/, (l) => `${l} holds up the skull and the neck vertebrae above it, and it protects the spinal cord as it runs through the neck.`],
  [/^vertebra t/, (l) => `${l} holds up the spine above it and anchors a pair of ribs, helping the rib cage support the heart and lungs.`],
  [/^vertebra l/, (l) => `${l} holds up the trunk and the vertebrae above it, sending body weight down into the sacrum.`],
  [/^sacrum$/, "The sacrum holds the lumbar spine on the pelvis and transmits the weight of the trunk into the hip bones."],
  [/^coccyx$/, "The coccyx is the tail end of the spine. It does not carry much body weight; it anchors the pelvic floor that holds the pelvic organs."],
  [/manubrium/, "The manubrium holds up the clavicles and first ribs at the top of the sternum, bracing the front of the rib cage."],
  [/body of sternum/, "The body of the sternum holds the costal cartilages in front and helps the rib cage support the heart and lungs."],
  [/xiphoid/, "The xiphoid process is the small lower tip of the sternum. It holds attachments of the diaphragm and abdominal wall rather than bearing body weight."],
  [/costal cartilage of first/, "This costal cartilage holds the first rib to the manubrium so the top of the rib cage stays open."],
  [/costal cartilage/, (l) => `${l} holds its rib to the sternum, keeping the front of the chest wall springy so the lungs can expand.`],
  [/first rib/, "The first rib holds up the top of the rib cage and helps support the structures that pass into the neck and arm."],
  [/twelfth rib|eleventh rib/, (l) => `${l} is a floating rib. It holds the lower chest wall and abdominal muscles rather than reaching the sternum.`],
  [/\brib$/, (l) => `${l} holds the side of the chest wall and, with the other ribs, supports the heart and lungs.`],
  [/^clavicle/, "The clavicle holds the scapula out from the sternum so the shoulder and arm stay supported away from the chest."],
  [/^scapula/, "The scapula holds the shoulder joint and the arm’s rotator-cuff muscles, hanging the upper limb from the trunk."],
  [/^humerus/, "The humerus holds up the forearm at the elbow and carries the weight and motion of the arm from the shoulder."],
  [/^radius/, "The radius holds the wrist and thumb side of the hand on the forearm, especially when the palm is turned."],
  [/^ulna/, "The ulna holds the forearm on the humerus at the elbow and supports the little-finger side of the wrist."],
  [/^hip bone/, "The hip bone holds the trunk on the lower limb. It sockets the femur and forms the bony bowl that supports the pelvic organs."],
  [/^femur/, "The femur holds up the trunk and pelvis above the knee and sends body weight into the tibia."],
  [/^patella/, "The patella sits in front of the knee. It holds the quadriceps tendon in line so the thigh can straighten the leg."],
  [/^tibia/, "The tibia holds up the femur at the knee and carries most of the body’s weight into the ankle and foot."],
  [/^fibula/, "The fibula holds the outside of the ankle and knee. It does not carry much body weight; it braces the tibia and anchors leg muscles."],
  [/calcaneus/, "The calcaneus is the heel bone. It holds the body up at the back of the foot and takes the pull of the Achilles tendon."],
  [/^talus/, "The talus holds the tibia and fibula on the foot and sends standing weight into the heel and arch."],
  [/navicular/, "The navicular holds the talus on the cuneiform bones and helps keep the medial arch of the foot up."],
  [/cuboid/, "The cuboid holds the calcaneus on the lateral metatarsals and helps keep the outer arch of the foot up."],
  [/medial cuneiform/, "The medial cuneiform holds the navicular on the first metatarsal and helps keep the inner arch of the foot up."],
  [/intermediate cuneiform/, "The intermediate cuneiform holds the navicular on the second metatarsal in the midfoot arch."],
  [/lateral cuneiform/, "The lateral cuneiform holds the navicular on the third metatarsal and helps keep the midfoot up."],
  [/first metatarsal/, "The first metatarsal holds the big toe on the medial cuneiform and carries a large share of standing weight."],
  [/fifth metatarsal/, "The fifth metatarsal holds the little toe on the cuboid along the outer border of the foot."],
  [/metatarsal/, (l) => `${l} holds its toe on the midfoot and helps keep the forefoot up during standing and push-off.`],
  [/proximal phalanx of first finger of foot/, "This proximal phalanx holds the big toe on the first metatarsal and takes the push of walking."],
  [/distal phalanx of first finger of foot/, "This distal phalanx is the tip of the big toe. It holds the toenail and the last push of each step."],
  [/phalanx of .*finger of foot/, (l) => `${l} holds that toe segment on the bone behind it so the toe can press the ground.`],
  [/sesamoid bones of foot/, "These sesamoid bones sit under the big-toe joint. They hold the flexor tendon off the floor and share the load of push-off."],
  [/^scaphoid/, "The scaphoid holds the radius on the distal carpal row and helps keep the thumb side of the wrist up."],
  [/^lunate/, "The lunate holds the radius in the middle of the wrist and shares load into the distal carpal bones."],
  [/triquetrum/, "The triquetrum holds the ulnar side of the wrist and sits under the pisiform."],
  [/pisiform/, "The pisiform is a small sesamoid on the triquetrum. It holds the flexor carpi ulnaris tendon and does not carry much body weight."],
  [/trapezium/, "The trapezium holds the thumb metacarpal on the scaphoid so the thumb can oppose the fingers."],
  [/trapezoid bone/, "The trapezoid holds the second metacarpal on the scaphoid in the wrist."],
  [/capitate/, "The capitate is the keystone of the wrist. It holds the third metacarpal on the lunate and scaphoid."],
  [/hamate/, "The hamate holds the fourth and fifth metacarpals on the ulnar side of the wrist."],
  [/first metacarpal/, "The first metacarpal holds the thumb on the trapezium so the thumb can meet the fingers."],
  [/fifth metacarpal/, "The fifth metacarpal holds the little finger on the hamate along the ulnar border of the hand."],
  [/metacarpal/, (l) => `${l} holds its finger on the wrist and forms the palm that supports grip.`],
  [/proximal phalanx of first finger of hand/, "This proximal phalanx holds the thumb on the first metacarpal."],
  [/distal phalanx of first finger of hand/, "This distal phalanx is the tip of the thumb. It holds the thumbnail and the pad used to pinch."],
  [/phalanx of .*finger of hand/, (l) => `${l} holds that finger segment on the bone behind it so the finger can grasp.`],
  [/frontal bone/, "The frontal bone holds up the forehead and the roof of the orbits, shielding the front of the brain."],
  [/parietal bone/, "The parietal bone holds up the side and roof of the skull, covering the upper brain."],
  [/occipital bone/, "The occipital bone holds the back of the skull on the atlas and shields the back of the brain."],
  [/temporal bone/, "The temporal bone holds the side of the skull, the ear, and the jaw joint."],
  [/sphenoid/, "The sphenoid holds the central skull base and the sides of the orbits, bracing almost every other cranial bone."],
  [/ethmoid/, "The ethmoid holds the midline of the nasal cavity and the medial walls of the orbits, sitting under the frontal lobes."],
  [/^vomer$/, "The vomer holds the lower nasal septum, helping keep the nasal cavity divided and open."],
  [/inferior nasal concha/, "The inferior nasal concha holds a scroll of bone in the nasal cavity that supports the mucosa warming inhaled air."],
  [/lacrimal bone/, "The lacrimal bone holds the inner wall of the orbit and the groove for tears."],
  [/nasal bone/, "The nasal bone holds the bridge of the nose."],
  [/maxilla/, "The maxilla holds the upper teeth, the floor of the orbit, and much of the midface."],
  [/palatine bone/, "The palatine bone holds the back of the hard palate and part of the nasal cavity and orbit."],
  [/zygomatic bone/, "The zygomatic bone holds the cheek and the outer rim of the orbit."],
  [/^mandible$/, "The mandible holds the lower teeth and forms the moving jaw that supports the tongue and floor of the mouth."],
  [/hyoid/, "The hyoid bone holds the tongue and larynx from above. It does not joint to any other bone."],
  [/malleus/, "The malleus holds the eardrum on the incus so sound vibration can cross the middle ear."],
  [/^incus/, "The incus holds the malleus on the stapes in the chain that carries sound to the inner ear."],
  [/stapes/, "The stapes holds the incus on the inner-ear window, the last bony link that carries sound inward."],
  [/thyroid cartilage/, "The thyroid cartilage holds up the front of the larynx, the shield that keeps the vocal folds in place."],
  [/cricoid cartilage/, "The cricoid cartilage holds the airway open as a complete ring under the thyroid cartilage."],
  [/arytenoid cartilage/, "The arytenoid cartilages sit on the cricoid and hold the vocal folds so they can open and close."],
  [/corniculate/, "The corniculate cartilages sit on the arytenoids and help hold the back of the vocal folds."],
  [/major alar cartilage/, "This alar cartilage holds the shape of the nostril so air can enter the nose."],
  [/nasal septal cartilage/, "This septal cartilage holds the front of the nasal septum, keeping the two nasal passages apart."],
  [/lateral process of nasal/, "This lateral process holds the side of the nasal septum against the alar cartilage."],
  [/upper medial incisor|upper lateral incisor/, (l) => `${l.replace(/ tooth$/i, "")} is set in the maxilla. It holds the front bite and cuts food against the lower incisor.`],
  [/lower medial incisor|lower lateral incisor/, (l) => `${l.replace(/ tooth$/i, "")} is set in the mandible. It holds the front bite and cuts food against the upper incisor.`],
  [/upper canine/, "The upper canine is set in the maxilla. It holds the corner of the bite and tears food."],
  [/lower canine/, "The lower canine is set in the mandible. It holds the corner of the bite and tears food."],
  [/upper .*premolar|upper .*molar/, (l) => `${l.replace(/ tooth$/i, "")} is set in the maxilla. It holds the back bite and grinds food against the tooth below.`],
  [/lower .*premolar|lower .*molar/, (l) => `${l.replace(/ tooth$/i, "")} is set in the mandible. It holds the back bite and grinds food against the tooth above.`],
  [/^bones$/, "These bones of the skeleton hold the body up, protect organs, and give muscles their levers."],
];

const MUSCLE_RULES = [
  [/^diaphragm/, "The diaphragm is the main muscle of breathing. When it contracts it flattens and pulls the lungs down, drawing air in; it works with the intercostal muscles so the chest and abdomen move together."],
  [/external intercostal/, "The external intercostal muscles lift the ribs during inhalation. They shorten between adjacent ribs and work with the diaphragm to expand the chest."],
  [/internal intercostal/, "The internal intercostal muscles draw the ribs down during forced exhalation. They work with the abdominal wall to shrink the chest after the diaphragm relaxes."],
  [/innermost intercostal/, "The innermost intercostal muscles stiffen the rib spaces. They work with the other intercostals so the chest wall does not suck in between the ribs."],
  [/transversus thoracis/, "Transversus thoracis pulls the costal cartilages inward during exhalation. It works with the internal intercostals on the inner face of the sternum."],
  [/levatores .*costarum/, "These levator costarum muscles lift the ribs a little during inhalation. They work with the external intercostals along the back of the rib cage."],
  [/serratus posterior superior/, "Serratus posterior superior lifts the upper ribs. It works with the external intercostals to help the chest expand."],
  [/serratus posterior inferior/, "Serratus posterior inferior steadies the lower ribs when the diaphragm pulls. It works with the abdominal wall during breathing."],
  [/rectus abdominis/, "Rectus abdominis flexes the trunk and supports the abdominal wall. It shortens from pubis to ribs and works with the obliques to hold the viscera and bend the spine."],
  [/pyramidalis/, "Pyramidalis tenses the lower linea alba. It is a small partner of rectus abdominis in the lowest part of the abdominal wall."],
  [/linea alba/, "The linea alba is the midline raphe of the abdominal wall. It holds the two rectus muscles together rather than contracting on its own."],
  [/external abdominal oblique/, "The external oblique rotates and flexes the trunk and braces the abdomen. Its fibers pull the ribs toward the opposite hip and work with the internal oblique and transversus abdominis."],
  [/internal abdominal oblique/, "The internal oblique rotates and flexes the trunk. It works as a pair with the opposite external oblique and helps hold the abdominal organs."],
  [/transversus abdominis/, "Transversus abdominis cinches the abdomen like a corset. It works with the obliques and pelvic floor to stabilize the lumbar spine."],
  [/quadratus lumborum/, "Quadratus lumborum steadies the lumbar spine and can hike the hip. It works with the diaphragm and psoas to hold the lower back."],
  [/psoas major/, "Psoas major flexes the hip and steadies the lumbar spine. It pulls the femur toward the trunk and works with iliacus as iliopsoas."],
  [/iliacus/, "Iliacus flexes the hip from the inner pelvis. It joins psoas major on the femur so the two act as iliopsoas."],
  [/pectineus/, "Pectineus flexes and adducts the hip. It works with the other adductors and iliopsoas at the front of the thigh."],
  [/adductor magnus/, "Adductor magnus pulls the thigh toward the midline and can extend the hip. It is the largest adductor and works with adductor longus and brevis."],
  [/adductor longus/, "Adductor longus pulls the thigh toward the midline. It works with adductor brevis and magnus to stabilize the stance leg."],
  [/adductor brevis/, "Adductor brevis pulls the thigh toward the midline, deep to adductor longus, and helps the other adductors control the hip."],
  [/gracilis/, "Gracilis adducts the thigh and helps flex the knee. It is the most medial of the adductors and works with them along the inner thigh."],
  [/gluteus maximus/, "Gluteus maximus extends and laterally rotates the hip. It is the main muscle that stands you up from a squat and works with the hamstrings."],
  [/gluteus medius/, "Gluteus medius abducts the hip and keeps the pelvis level in walking. It works with gluteus minimus on the side of the ilium."],
  [/gluteus minimus/, "Gluteus minimus abducts the hip and steadies the pelvis. It works under gluteus medius during single-leg stance."],
  [/tensor fascia/, "Tensor fasciae latae steadies the hip and tenses the iliotibial tract. It works with gluteus medius to keep the pelvis level."],
  [/piriformis/, "Piriformis laterally rotates the hip and can abduct a flexed thigh. It works with the gemelli and obturators deep in the buttock."],
  [/gemellus|obturator internus|obturator externus|quadratus femoris/, (l) => `${l} is a deep lateral rotator of the hip. It turns the thigh outward and works with piriformis to steady the femoral head in the socket.`],
  [/rectus femoris/, "Rectus femoris flexes the hip and extends the knee. It is the only quadriceps that crosses the hip, and it works with the three vasti to straighten the leg."],
  [/vastus lateralis/, "Vastus lateralis extends the knee from the outer thigh. It works with vastus medialis and intermedius as the rest of quadriceps."],
  [/vastus medialis/, "Vastus medialis extends the knee from the inner thigh and helps track the patella. It works with the other vasti."],
  [/vastus intermedius/, "Vastus intermedius extends the knee from deep in the thigh, under rectus femoris, as part of quadriceps."],
  [/sartorius/, "Sartorius flexes, abducts, and laterally rotates the hip and flexes the knee. It is the long strap that works with iliopsoas and the hamstrings to sit cross-legged."],
  [/long head of biceps femoris/, "The long head of biceps femoris extends the hip and flexes the knee. It works with semitendinosus and semimembranosus as the hamstrings."],
  [/short head of biceps femoris/, "The short head of biceps femoris flexes the knee only. It joins the long head at the fibula and works with the other hamstrings."],
  [/semitendinosus/, "Semitendinosus extends the hip and flexes the knee. It works with semimembranosus and biceps femoris on the inner back of the thigh."],
  [/semimembranosus/, "Semimembranosus extends the hip and flexes the knee. It is the deepest hamstring and works with semitendinosus."],
  [/gastrocnemius/, (l) => `${l} plantarflexes the ankle and helps flex the knee. Its two heads join soleus in the Achilles tendon to push the body up onto the toes.`],
  [/soleus/, "Soleus plantarflexes the ankle, especially in standing. It works under gastrocnemius and shares the Achilles tendon."],
  [/plantaris/, "Plantaris is a thin helper of gastrocnemius. It weakly plantarflexes the ankle and flexes the knee."],
  [/popliteus/, "Popliteus unlocks the knee by rotating the tibia at the start of flexion. It works with the hamstrings when the knee begins to bend."],
  [/tibialis anterior/, "Tibialis anterior dorsiflexes and inverts the foot so the toes clear the ground. It works with extensor hallucis and digitorum longus."],
  [/tibialis posterior/, "Tibialis posterior inverts the foot and supports the medial arch. It works with the other deep posterior leg muscles during push-off."],
  [/extensor hallucis longus/, "Extensor hallucis longus lifts the big toe and helps dorsiflex the ankle. It works with tibialis anterior in the swing of walking."],
  [/extensor digitorum longus/, "Extensor digitorum longus lifts the lesser toes and helps dorsiflex the ankle. It works with tibialis anterior on the front of the leg."],
  [/fibularis longus/, "Fibularis longus everts the foot and steadies the outer ankle. It works with fibularis brevis along the lateral leg."],
  [/fibularis brevis/, "Fibularis brevis everts the foot and holds the fifth metatarsal. It works with fibularis longus to keep the ankle from rolling inward."],
  [/fibularis tertius/, "Fibularis tertius everts the foot and helps dorsiflex it. It works with the long toe extensors on the front of the ankle."],
  [/flexor hallucis longus/, "Flexor hallucis longus flexes the big toe and helps plantarflex the ankle. It works with flexor digitorum longus in the push of walking."],
  [/flexor digitorum longus/, "Flexor digitorum longus flexes the lesser toes and helps support the arch. It works with flexor hallucis longus in the deep posterior leg."],
  [/flexor hallucis brevis/, (l) => `${l} flexes the big toe at the metatarsal joint. It works with adductor hallucis and the long flexor during push-off.`],
  [/adductor hallucis/, (l) => `${l} pulls the big toe toward the second toe and steadies the forefoot. It works with flexor hallucis brevis.`],
  [/pectoralis major|abdominal part of pectoralis|clavicular head of pectoralis|sternocostal head of pectoralis/, (l) => `${l} adducts and internally rotates the arm and can flex or extend it depending on the fibers. The heads work together to pull the humerus across the chest.`],
  [/pectoralis minor/, "Pectoralis minor pulls the scapula forward and down. It works under pectoralis major to stabilize the shoulder girdle."],
  [/subclavius/, "Subclavius steadies the clavicle. It works with pectoralis minor to hold the shoulder girdle on the chest."],
  [/serratus anterior/, "Serratus anterior protracts and rotates the scapula so the arm can raise above the head. It works with trapezius against the chest wall."],
  [/latissimus dorsi/, "Latissimus dorsi adducts, extends, and internally rotates the arm. It works with teres major and pectoralis major to pull the humerus down and back."],
  [/teres major/, "Teres major adducts and internally rotates the arm. It works with latissimus dorsi from the back of the scapula."],
  [/supraspinatus/, "Supraspinatus starts abduction of the arm and seats the humeral head. It is the uppermost rotator-cuff muscle and works with deltoid."],
  [/infraspinatus/, "Infraspinatus externally rotates the arm and steadies the humeral head. It works with teres minor in the rotator cuff."],
  [/teres minor/, "Teres minor externally rotates the arm and steadies the humeral head. It works with infraspinatus in the rotator cuff."],
  [/subscapularis/, "Subscapularis internally rotates the arm and holds the humeral head in the socket from the front of the scapula."],
  [/acromial part of deltoid|clavicular part of deltoid|scapular spinal part of deltoid/, (l) => `${l} moves the arm at the shoulder — the middle fibers abduct, the front fibers flex, and the back fibers extend. The three parts of deltoid work as one cap over the rotator cuff.`],
  [/coracobrachialis/, "Coracobrachialis flexes and adducts the arm. It works with the short head of biceps on the front of the humerus."],
  [/long head of biceps brachii/, "The long head of biceps brachii flexes the elbow and supinates the forearm, and it helps flex the shoulder. It works with the short head and brachialis."],
  [/short head of biceps brachii/, "The short head of biceps brachii flexes the elbow and supinates the forearm. It works with the long head and brachialis on the front of the arm."],
  [/brachialis/, "Brachialis is the main flexor of the elbow. It pulls the ulna toward the humerus and works under biceps brachii."],
  [/long head of triceps|lateral head of triceps|medial head of triceps/, (l) => `${l} extends the elbow. The three heads of triceps brachii work together, and the long head also steadies the shoulder.`],
  [/anconeus/, "Anconeus helps triceps extend the elbow and steadies the ulna during rotation of the forearm."],
  [/brachioradialis/, "Brachioradialis flexes the elbow, especially with the thumb up. It works with brachialis and biceps along the radial side of the forearm."],
  [/pronator teres/, (l) => `${l} pronates the forearm and helps flex the elbow. It works with pronator quadratus to turn the palm down.`],
  [/pronator quadratus/, "Pronator quadratus pronates the forearm from the wrist. It is the main partner of pronator teres for turning the palm down."],
  [/supinator/, "Supinator turns the palm up by rotating the radius on the ulna. It works with biceps brachii in supination."],
  [/flexor carpi radialis/, "Flexor carpi radialis flexes and abducts the wrist. It works with flexor carpi ulnaris to curl the hand."],
  [/flexor carpi ulnaris/, (l) => `${l} flexes and adducts the wrist. It works with flexor carpi radialis as the two wrist flexors.`],
  [/palmaris longus/, "Palmaris longus weakly flexes the wrist and tenses the palmar aponeurosis. It is often missing and works with the other wrist flexors when present."],
  [/flexor digitorum superficialis/, (l) => `${l} flexes the fingers at the middle joints and helps flex the wrist. It works with flexor digitorum profundus to close the hand.`],
  [/flexor digitorum profundus/, "Flexor digitorum profundus flexes the fingertips. It works with flexor digitorum superficialis so the fingers can make a fist."],
  [/flexor pollicis longus/, "Flexor pollicis longus flexes the thumb. It works with the thenar muscles to pinch and grip."],
  [/flexor pollicis brevis/, (l) => `${l} flexes the thumb at the metacarpal joint. It works with flexor pollicis longus and opponens pollicis in the thenar eminence.`],
  [/abductor pollicis longus/, "Abductor pollicis longus lifts the thumb away from the palm. It works with extensor pollicis longus and brevis."],
  [/abductor pollicis brevis/, "Abductor pollicis brevis lifts the thumb away from the palm in the thenar eminence. It works with opponens pollicis."],
  [/extensor pollicis longus/, "Extensor pollicis longus extends the thumb, including its tip. It works with extensor pollicis brevis."],
  [/extensor pollicis brevis/, "Extensor pollicis brevis extends the thumb at the metacarpal joint. It works with extensor pollicis longus."],
  [/opponens pollicis/, "Opponens pollicis turns the thumb to meet the fingers. It is the key thenar muscle of opposition."],
  [/adductor pollicis/, (l) => `${l} pulls the thumb against the palm for pinch. It works with the thenar muscles to grip.`],
  [/extensor carpi radialis longus/, "Extensor carpi radialis longus extends and abducts the wrist. It works with extensor carpi radialis brevis."],
  [/extensor carpi radialis brevis/, "Extensor carpi radialis brevis extends the wrist. It works with extensor carpi radialis longus on the thumb side."],
  [/extensor carpi ulnaris/, (l) => `${l} extends and adducts the wrist. It works with the radial extensors to hold the wrist steady for grip.`],
  [/extensor digitorum/, "Extensor digitorum extends the fingers. It works with extensor indicis and extensor digiti minimi on the back of the forearm."],
  [/extensor digiti minimi/, "Extensor digiti minimi extends the little finger. It works with extensor digitorum."],
  [/extensor indicis/, "Extensor indicis extends the index finger independently. It works with extensor digitorum."],
  [/abductor digiti minimi of hand/, "Abductor digiti minimi of the hand pulls the little finger away from the others. It works with flexor and opponens digiti minimi in the hypothenar eminence."],
  [/flexor digiti minimi of hand/, "Flexor digiti minimi of the hand flexes the little finger. It works with the other hypothenar muscles."],
  [/opponens digiti minimi/, "Opponens digiti minimi cups the little-finger metacarpal toward the thumb, deepening the palm for grip."],
  [/lumbrical muscles of hand/, "The lumbricals flex the knuckles and extend the finger tips. They work with the interossei for fine finger control."],
  [/dorsal interossei muscles of hand/, "The dorsal interossei spread the fingers and help flex the knuckles. They work with the palmar interossei and lumbricals."],
  [/palmar interossei/, "The palmar interossei pull the fingers together and help flex the knuckles. They work opposite the dorsal interossei."],
  [/descending part of trapezius|transverse part of trapezius|ascending part of trapezius/, (l) => `${l} moves the scapula — upper fibers shrug, middle fibers retract, lower fibers depress. The three parts of trapezius work with levator scapulae and the rhomboids.`],
  [/levator scapulae/, "Levator scapulae shrugs and downwardly rotates the scapula. It works with the upper trapezius."],
  [/rhomboid major/, "Rhomboid major retracts and downwardly rotates the scapula. It works with rhomboid minor to square the shoulders."],
  [/rhomboid minor/, "Rhomboid minor retracts the scapula just above rhomboid major. The two rhomboids work together."],
  [/splenius capitis/, "Splenius capitis extends and rotates the head. It works with splenius colli and the deep neck extensors."],
  [/splenius colli/, "Splenius colli extends and rotates the neck. It works with splenius capitis along the back of the neck."],
  [/sternocleidomastoid/, "Sternocleidomastoid turns the head to the opposite side and flexes the neck. The two sides work together to lift the head or help inhalation."],
  [/scalenus/, (l) => `${l} bends the neck and can lift the first or second rib. The scalenes work together and with sternocleidomastoid.`],
  [/longus capitis/, "Longus capitis flexes the head on the neck. It works with longus colli on the front of the cervical spine."],
  [/longus colli/, "Longus colli flexes and steadies the neck from the front. It works with longus capitis as the deep neck flexors."],
  [/rectus anterior capitis|rectus lateralis capitis|rectus posterior major|rectus posterior minor|obliquus inferior capitis|obliquus superior capitis/, (l) => `${l} is a suboccipital muscle. It makes small nodding or rotating movements of the head on C1–C2 and works with the other suboccipitals to steady the skull.`],
  [/iliocostalis|longissimus|spinalis/, (l) => `${l} is part of erector spinae. It extends and steadies the spine and works with the other erector columns and multifidus.`],
  [/multifidus/, (l) => `${l} is a deep stabilizer of the spine. Its short fibers hold vertebrae together and work with rotatores and erector spinae.`],
  [/rotatores/, "The rotatores are the deepest back muscles. They rotate and stabilize adjacent vertebrae and work with multifidus."],
  [/interspinales/, (l) => `${l} span adjacent spinous processes. They help extend the spine and work with multifidus.`],
  [/intertransversarii/, (l) => `${l} span adjacent transverse processes. They help side-bend and stabilize the spine.`],
  [/semispinalis/, (l) => `${l} extends and rotates the head and spine. It works with splenius and erector spinae along the back of the neck and thorax.`],
  [/masseter/, (l) => `${l} closes the jaw with great force. It works with temporalis and the pterygoids in chewing.`],
  [/temporalis/, "Temporalis closes the jaw and retracts it. It works with masseter over the side of the skull."],
  [/lateral pterygoid/, (l) => `${l} opens the jaw and moves it side to side. It works with the medial pterygoid in chewing and speaking.`],
  [/medial pterygoid/, "The medial pterygoid closes the jaw and moves it toward the opposite side. It works with masseter as a sling around the mandible."],
  [/digastric/, (l) => `${l} helps open the jaw and steady the hyoid. The two bellies work with mylohyoid and stylohyoid in swallowing.`],
  [/mylohyoid/, "Mylohyoid lifts the floor of the mouth and the hyoid in swallowing. It works with geniohyoid and the digastric."],
  [/geniohyoid/, "Geniohyoid pulls the hyoid forward. It works with mylohyoid to open the airway for swallowing."],
  [/stylohyoid/, "Stylohyoid lifts and retracts the hyoid. It works with the posterior digastric during swallowing."],
  [/genioglossus/, "Genioglossus sticks the tongue out and keeps it from falling back. It is the main tongue muscle of speech and swallowing."],
  [/hyoglossus/, "Hyoglossus pulls the tongue down and back. It works with genioglossus and styloglossus to shape the tongue."],
  [/frontalis/, "Frontalis raises the eyebrows and wrinkles the forehead. It works with occipitalis through the epicranial aponeurosis."],
  [/occipitalis/, "Occipitalis pulls the scalp back. It works with frontalis through the epicranial aponeurosis."],
  [/epicranial aponeurosis/, "The epicranial aponeurosis is the flat tendon over the skull. It holds frontalis to occipitalis rather than contracting itself."],
  [/temporoparietalis/, "Temporoparietalis tenses the scalp above the ear. It is a small partner of the occipitofrontalis."],
  [/corrugator supercilii/, "Corrugator supercilii draws the eyebrows together into a frown. It works with procerus and orbicularis oculi."],
  [/procerus/, "Procerus wrinkles the skin at the root of the nose. It works with corrugator in a frown."],
  [/orbicularis oculi/, (l) => `${l} closes the eyelids. The palpebral part blinks gently; the orbital part squeezes the eye shut, working with levator palpebrae which opens it.`],
  [/levator palpebrae/, "Levator palpebrae superioris opens the upper eyelid. It works against orbicularis oculi."],
  [/nasalis|depressor septi|levator nasolabialis/, (l) => `${l} shapes the nose and nostrils. It works with the other nasal muscles in facial expression and breathing.`],
  [/orbicularis oris/, "Orbicularis oris closes and purses the lips. It works with the levators and depressors of the mouth in speech and eating."],
  [/bucinator|buccinator/, "Buccinator presses the cheek against the teeth. It works with orbicularis oris to keep food in the mouth and to blow air."],
  [/zygomaticus major/, "Zygomaticus major lifts the corner of the mouth into a smile. It works with zygomaticus minor and levator anguli oris."],
  [/zygomaticus minor/, "Zygomaticus minor lifts the upper lip. It works with zygomaticus major in smiling."],
  [/levator anguli oris/, "Levator anguli oris lifts the corner of the mouth. It works with zygomaticus major."],
  [/levator labii superioris/, "Levator labii superioris lifts the upper lip. It works with zygomaticus minor in showing the upper teeth."],
  [/depressor anguli oris/, "Depressor anguli oris pulls the corner of the mouth down. It works against the zygomaticus muscles in a frown."],
  [/depressor labii inferioris/, "Depressor labii inferioris pulls the lower lip down. It works with mentalis and platysma."],
  [/mentalis/, "Mentalis wrinkles the chin and pushes the lower lip up. It works with orbicularis oris."],
  [/risorius/, "Risorius pulls the corner of the mouth sideways. It works with zygomaticus major in a grin."],
  [/platysma/, "Platysma tenses the skin of the neck and can pull the mouth down. It is a thin sheet that works with the depressors of the lip."],
  [/superior rectus muscle/, "The superior rectus turns the eye up. It works with the other extra-ocular muscles so both eyes point at the same target."],
  [/inferior rectus muscle/, "The inferior rectus turns the eye down. It works with the other extra-ocular muscles to aim the gaze."],
  [/medial rectus muscle/, "The medial rectus turns the eye toward the nose. It works with the opposite lateral rectus in convergence."],
  [/lateral rectus muscle/, "The lateral rectus turns the eye out. It works with the opposite medial rectus so the two eyes move together."],
  [/superior oblique muscle/, "The superior oblique turns the eye down and in. It works through a trochlea pulley with the other extra-ocular muscles."],
  [/inferior oblique muscle/, "The inferior oblique turns the eye up and out. It works with the superior rectus in elevation."],
  [/trochlea of superior oblique/, "This trochlea is a pulley, not a muscle. It holds the superior oblique tendon so the muscle can turn the eye."],
  [/common tendinous ring/, "The common tendinous ring is the shared origin of the rectus muscles of the eye at the back of the orbit."],
  [/tarsus$/, (l) => `${l} is a dense plate in the eyelid, not a skeletal muscle. It holds the eyelid’s shape so orbicularis oculi and levator palpebrae can move it.`],
  [/pharyngeal constrictor/, (l) => `${l} squeezes a bolus of food down the throat. The three constrictors fire in sequence with palatopharyngeus and stylopharyngeus.`],
  [/palatopharyngeus/, "Palatopharyngeus shortens the pharynx and helps close the oropharynx in swallowing. It works with the constrictors."],
  [/stylopharyngeus/, "Stylopharyngeus lifts the pharynx during swallowing. It works with the constrictors and palatopharyngeus."],
  [/cricothyroid/, (l) => `${l} tenses the vocal folds by tipping the thyroid cartilage. It works with thyro-arytenoid to set pitch.`],
  [/thyro-arytenoid|thyro-epiglottic/, (l) => `${l} shortens and relaxes the vocal folds. It works with cricothyroid and the arytenoid muscles in phonation.`],
  [/crico-arytenoid/, (l) => `${l} opens or closes the glottis by rotating the arytenoid cartilages. These muscles work together so air can pass or the voice can sound.`],
  [/arytenoid/, (l) => `${l} brings the arytenoid cartilages together, closing the back of the glottis. It works with the crico-arytenoids.`],
  [/omohyoid/, "Omohyoid depresses the hyoid after swallowing. It works with sternohyoid and sternothyroid as the infrahyoid strap muscles."],
  [/sternohyoid/, "Sternohyoid pulls the hyoid down. It works with omohyoid and thyrohyoid to reset the larynx after a swallow."],
  [/sternothyroid/, "Sternothyroid pulls the larynx down. It works with the other infrahyoid muscles."],
  [/thyrohyoid/, "Thyrohyoid either lifts the larynx or depresses the hyoid. It works with the other strap muscles around the voice box."],
];

const PARTS = {
  skin:
    "Skin is the outer barrier of the integumentary system. It keeps water in, pathogens out, and helps regulate temperature through its blood supply and sweat glands. Sensory endings in the dermis report touch, pain, and temperature, and the skin works with hair, nails, and subcutaneous fat so the body can sense the world while staying sealed and insulated.",
  hair:
    "Hair is a keratin shaft grown from follicles in the skin. It cushions the scalp, traps a layer of air for warmth, and keeps sweat and dust out of the eyes and nose. Arrector muscles and sebaceous glands of the integumentary system work with each follicle so hair can stand, shine, and shed on a cycle.",
  nails:
    "Nails are hard keratin plates on the ends of the digits. They protect the fingertip pads, improve fine pinch, and grow from a matrix under the proximal fold. They belong with skin and hair in the integumentary system as the tough, dead surface that the living nail bed continually replaces.",
  thyroid:
    "The thyroid sits on the trachea and makes T3 and T4, hormones that set the body’s metabolic rate, plus calcitonin, which tones down blood calcium. Follicular cells take up iodine and release hormone into capillaries under TSH from the pituitary. The parathyroids on its back surface raise calcium via PTH, so this cluster works as an endocrine team with bone, kidney, and gut to keep energy use and mineral balance in range.",
  adrenal:
    "Each adrenal gland caps a kidney. The cortex secretes cortisol, aldosterone, and androgens; the medulla dumps epinephrine and norepinephrine for fight-or-flight. Cortical steroids are made from cholesterol on ACTH cue, while medullary cells are modified sympathetic neurons. Together with the pituitary, kidneys, and autonomic nerves, the adrenals adjust blood pressure, glucose, and stress responses.",
  pituitary:
    "The pituitary hangs from the hypothalamus and the pineal sits in the midbrain roof. Anterior-pituitary cells release GH, TSH, ACTH, FSH, LH, and prolactin when hypothalamic releasing hormones arrive; the posterior lobe stores oxytocin and ADH made in the hypothalamus. Pinealocytes secrete melatonin on a light-dark cycle. These glands pace almost every other endocrine organ and also sit in the nervous system’s control loop.",
  lungs:
    "The lungs exchange oxygen and carbon dioxide. Air is drawn into alveoli, where a thin barrier lets gases diffuse into and out of pulmonary capillaries. Elastic recoil and surfactant keep the sacs from collapsing, and the two lungs work with the diaphragm, chest wall, and pulmonary vessels of the respiratory and cardiovascular systems so every tissue gets oxygen and dumps CO2.",
  airway:
    "The trachea, bronchi, larynx, and nasal cavity are the conducting airway. Cartilage rings hold the tubes open, cilia and mucus trap debris, and the larynx houses the vocal folds. These passages warm and filter air on the way to the alveoli and work with the lungs, pharynx, and diaphragm as one respiratory path.",
  pleura:
    "Pleura is the thin serous membrane wrapping each lung and lining the chest wall. A film of fluid in the pleural cavity lets the lung slide while surface tension keeps it expanded against the wall. It works with the diaphragm and rib cage so that when the chest expands, the lung must follow.",
  pharynx:
    "The pharynx is the shared throat behind the nose and mouth. It conducts air to the larynx and food to the esophagus, using constrictor muscles and the soft palate to keep the two streams from mixing. It therefore belongs to both the respiratory and digestive systems and works with the tongue, epiglottis, and esophagus in every swallow and breath.",
  kidneys:
    "The kidneys filter blood in millions of nephrons, reclaiming water and salts and dumping wastes into urine. Juxtaglomerular cells release renin, and the renal cortex also activates vitamin D, so the kidneys are endocrine as well as urinary. They work with the heart, adrenals, and bladder to control blood pressure, pH, and fluid volume.",
  "urinary-tract":
    "The ureters, bladder, and urethra carry urine from the kidneys to the outside. Peristalsis in the ureters fills the bladder; detrusor muscle and sphincters then void under nervous control. This tract works with the kidneys as the urinary system’s plumbing, storing waste until it can be released.",
  liver:
    "The liver processes nutrients from the portal vein, makes bile, stores glycogen, and clears toxins and old red cells. Hepatocytes sit in plates bathed by sinusoids so blood and bile flow in opposite directions. It works with the gallbladder, pancreas, and intestines of the digestive system, and also feeds the cardiovascular system with plasma proteins and clotting factors.",
  biliary:
    "The gallbladder stores and concentrates bile; the bile ducts deliver it to the duodenum. Cholecystokinin from the gut empties the gallbladder when fat arrives. Bile salts emulsify fats so pancreatic lipase can work, linking this tree to the liver and pancreas in digestion.",
  pancreas:
    "The pancreas has a digestive exocrine part that pours enzymes and bicarbonate into the duodenum, and an endocrine islet part that secretes insulin and glucagon into blood. Acinar enzymes break down starch, fat, and protein; islet hormones set blood glucose. It therefore sits in both the digestive and endocrine systems and works with the liver, gut, and blood.",
  stomach:
    "The stomach churns food into chyme and begins protein digestion with acid and pepsin. Smooth-muscle layers mix the meal, and pyloric sphincters meter it into the duodenum. It works with the esophagus, intestines, and pancreas so the digestive system can store, sterilize, and start breaking down a meal.",
  intestines:
    "The small intestine finishes digestion and absorbs nutrients across villi; the large intestine reclaims water and forms feces. Peristalsis and segmental mixing move chyme while enzymes from the pancreas and bile from the liver act in the lumen. The intestines work with those accessory organs and the enteric nervous system as the long tube of digestion.",
  mouth:
    "The mouth, tongue, and salivary glands start digestion. Teeth cut and grind, the tongue positions the bolus, and saliva wets food and begins starch breakdown with amylase. This cluster works with the pharynx and esophagus to swallow, and with the rest of the digestive system to get a meal on its way.",
  oesophagus:
    "The esophagus is the muscular tube from pharynx to stomach. Coordinated peristalsis and sphincters at each end push a bolus down and keep acid from rising. It works with the mouth and stomach as the digestive highway through the chest.",
  peritoneum:
    "Peritoneum and omentum are the serous lining and fatty apron of the abdomen. They let gut loops slide, carry vessels, and wall off infection. They work with the intestines and mesenteries of the digestive system as both lubricant and support.",
  "lymph-organs":
    "The spleen filters blood and stores platelets; the thymus educates T-lymphocytes; the tonsils sample inhaled and ingested antigens. Each is packed with immune cells that trap pathogens and start a response. They work with lymph nodes and vessels of the lymphatic system, and with the cardiovascular system that delivers the blood the spleen screens.",
  "lymph-nodes":
    "Lymph nodes are filters on lymphatic vessels. Lymph percolates through sinuses packed with lymphocytes and macrophages that catch debris and antigens, then swollen nodes become sites of clonal expansion. They work with lymph vessels and lymphoid organs so the immune system can inspect fluid returning to blood.",
  "lymph-vessels":
    "Lymphatic vessels collect excess tissue fluid and fats from the gut and return them to the veins. Valves and smooth muscle keep lymph moving toward the thoracic duct and right lymphatic duct. They work with lymph nodes and the cardiovascular system to drain tissues and seed immune cells.",
  heart:
    "The heart is a four-chamber pump. Atrial and ventricular myocardium squeeze in sequence under the SA and AV nodes, driving blood through the valves into the lungs and body. Coronary vessels feed the muscle itself. The heart works with arteries and veins of the cardiovascular system — and with lungs — so every organ receives oxygenated blood.",
  veins:
    "Veins return blood to the heart. Thin walls, valves, and muscle pumps move low-pressure blood toward the venae cavae and pulmonary veins. They work with arteries and the heart as the return limb of the cardiovascular circuit, and they also store a large fraction of blood volume.",
  arteries:
    "Arteries carry blood away from the heart under high pressure. Elastic walls in the aorta damp the pulse; muscular arteries and arterioles then set resistance and flow to each organ. They work with the heart and veins of the cardiovascular system so oxygen, nutrients, and hormones reach tissues in a regulated stream.",
  eyes:
    "The eyes focus light on the retina, where photoreceptors convert it to nerve signals. The cornea and lens refract, the iris sets the pupil, and extra-ocular muscles aim the globe. Optic nerves carry the image to the brain, so the eyes work with the rest of the nervous system — and with the extra-ocular muscles — as the sense of sight.",
  ears:
    "The ears collect sound and sense balance. The drum and ossicles drive the cochlea, hair cells fire the cochlear nerve, and the semicircular canals and otolith organs report head motion. They work with cranial nerves and the brainstem of the nervous system for hearing and equilibrium.",
  "spinal-cord":
    "The spinal cord is the nerve highway inside the vertebral canal. Sensory axons climb, motor axons descend, and spinal reflexes synapse in the gray matter. Dorsal and ventral roots join mixed spinal nerves. It works with the brain, meninges, and peripheral nerves of the nervous system to link body and brainstem.",
  nerves:
    "Nerves and ganglia are the peripheral wiring of the nervous system. Myelinated axons carry action potentials to and from the CNS; autonomic ganglia relay visceral control. They work with the brain and spinal cord so skeletal muscle, organs, and skin can send signals and receive commands.",
  meninges:
    "The meninges — dura, arachnoid, and pia — wrap the brain and spinal cord. They hold cerebrospinal fluid in the subarachnoid space, support vessels, and cushion the CNS. They work with the skull, vertebrae, and cerebrospinal fluid as the nervous system’s mechanical protection.",
  cerebellum:
    "The cerebellum sits under the occipital lobes and fine-tunes movement. Its cortex compares intended motion from the brain with actual motion from the spinal cord and sends corrections through the deep nuclei. It works with the brainstem, motor cortex, and spinal cord so posture and timing stay accurate.",
  brainstem:
    "The brainstem — midbrain, pons, and medulla — is the stalk of the brain. It houses cranial-nerve nuclei, the reticular formation, and the vital centers for breathing and heart rate, and it is the highway between spinal cord and forebrain. It works with the brain, cerebellum, and spinal cord of the nervous system as both relay and life-support controller.",
  brain:
    "The brain is the control center of the nervous system. Cortex, white-matter tracts, and deep nuclei process sensation, plan movement, and run language, memory, and emotion, while ventricles circulate CSF. It works with the brainstem, cerebellum, and spinal cord — and with the endocrine hypothalamus–pituitary axis — so thought and body stay coordinated.",
  bones:
    "These bones of the skeleton hold the body up, protect organs, and give muscles their levers. Joints and ligaments link them so the muscular system can move one bone on another.",
  muscles:
    "These skeletal muscles move the body by shortening and pulling on bones. They work in opposing pairs and groups around each joint, and they share the job with the skeleton that gives them leverage.",
};
