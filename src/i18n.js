/**
 * @file Internationalization strings and helpers
 */

import { LANGUAGES } from './config.js';

/**
 * @typedef {Object} UIStrings
 * @property {string} tagline
 * @property {string} back
 * @property {string} adminTitle
 * @property {string} unlock
 * @property {string} save
 * @property {string} return
 * @property {string} password
 * @property {string} wrongPw
 * @property {string} saved
 * @property {string} videos
 * @property {string} appearance
 * @property {string} language
 * @property {string} security
 * @property {string} about
 * @property {string} selectAll
 * @property {string} deselectAll
 * @property {string} scanFolder
 * @property {string} logo
 * @property {string} accentColor
 * @property {string} theme
 * @property {string} dark
 * @property {string} light
 * @property {string} changePw
 * @property {string} volume
 * @property {string} noVideos
 * @property {string} errTitle
 * @property {string} errMsg
 * @property {string} errBtn
 * @property {string} showOnScreen
 * @property {string} openAdminToConfigure
 * @property {string} displayedMedia
 * @property {string} languageLibrary
 * @property {string} chooseLanguageFolder
 * @property {string} displayName
 * @property {string} noVideosLoaded
 * @property {string} noLogoSet
 * @property {string} uploadLogo
 * @property {string} remove
 * @property {string} logoHint
 * @property {string} accentNote
 * @property {string} enterPasswordToContinue
 * @property {string} newPassword
 * @property {string} confirmPassword
 * @property {string} leaveBlankKeepCurrent
 * @property {string} repeatNewPassword
 * @property {string} pwMin
 * @property {string} pwMismatch
 * @property {string} pwDigits
 * @property {string} exit
 * @property {string} exitConfirm
 * @property {string} exiting
 * @property {string} exitStillOpen
 * @property {string} exitFailed
 * @property {string} scan
 * @property {string} scanning
 * @property {string} noVideosFound
 * @property {string} videosFoundAcross
 * @property {string} videosFound
 * @property {string} pickImageFile
 * @property {string} imageUnder3mb
 * @property {string} viewMode
 * @property {string} viewCardsMedium
 * @property {string} viewCardsLarge
 * @property {string} viewCardsSmall
 * @property {string} viewListComfort
 * @property {string} viewListCompact
 * @property {string} aboutEyebrow
 * @property {string} aboutDescription
 * @property {string} aboutImageFallback
 * @property {string} aboutVersion
 * @property {string} aboutBuildDate
 * @property {string} aboutLicense
 * @property {string} aboutAuthor
 * @property {string} aboutGithub
 * @property {string} aboutIssues
 * @property {string} aboutLinkFailed
 */

/** @type {Object.<string, UIStrings>} */
export const UI_STRINGS = {
  en: {
    tagline:'Select a video to watch', back:'Back', adminTitle:'Kiosk Settings',
    unlock:'Login', save:'Save', return:'Return',
    password:'Password', wrongPw:'Incorrect password — try again.', saved:'Settings saved',
    videos:'Videos', appearance:'Appearance', language:'Language', security:'Security', about:'About',
    selectAll:'Select all', deselectAll:'Deselect all', scanFolder:'Scan folder\u2026',
    logo:'Logo', accentColor:'Accent Colour', theme:'Theme', dark:'Dark', light:'Light',
    changePw:'Change Password', volume:'Volume', noVideos:'No videos to display',
    errTitle:'Cannot play this video', errMsg:'File missing or codec not supported.', errBtn:'Return to library',
    showOnScreen:'Show on screen',
    openAdminToConfigure:'Open admin settings to configure your video library.',
    displayedMedia:'Displayed Media', languageLibrary:'Language library', chooseLanguageFolder:'Choose which language folder you want to manage.',
    displayName:'Display name',
    noVideosLoaded:'No videos loaded. Use the Scan button (top right) to scan the media folder.',
    noLogoSet:'No logo set', uploadLogo:'Upload logo', remove:'Remove',
    logoHint:'Auto-loaded from assets/logo.png (also tries .jpg and .svg). Upload below to override.',
    accentNote:'Applies to buttons and focus rings. Backgrounds stay neutral.',
    enterPasswordToContinue:'Enter your password to continue',
    newPassword:'New password', confirmPassword:'Confirm password',
    leaveBlankKeepCurrent:'Leave blank to keep current', repeatNewPassword:'Repeat new password',
    pwMin:'Password must be at least 4 characters.', pwMismatch:'Passwords do not match.', pwDigits:'Password must use numbers only.',
    exit:'Exit',
    exitConfirm:'Exit kiosk now? This will close the kiosk window and stop the local server.',
    exiting:'Exiting...',
    exitStillOpen:'Exit request sent, but kiosk is still open. Please launch again if needed and retry Exit.',
    exitFailed:'Could not exit kiosk. Please try again.',
    scan:'Scan...', scanning:'Scanning...',
    noVideosFound:'No videos found. Refresh the media manifest and try again.',
    videosFoundAcross:'{count} videos found across {langs} languages', videosFound:'{count} videos found',
    pickImageFile:'Please select an image file.', imageUnder3mb:'Image must be under 3 MB.',
    viewMode:'View Mode', viewCardsMedium:'Card size (medium)', viewCardsLarge:'Cards (larger)', viewCardsSmall:'Cards (smaller)', viewListComfort:'Comfortable list', viewListCompact:'Compact list',
    aboutEyebrow:'Portable kiosk app', aboutDescription:'Fullscreen media kiosk for exhibitions with multilingual playback, admin controls, and local offline-friendly hosting.',
    aboutImageFallback:'Brand image unavailable', aboutVersion:'Version', aboutBuildDate:'Build date', aboutLicense:'License', aboutAuthor:'Author',
    aboutGithub:'View on GitHub', aboutIssues:'Report an issue',
    aboutLinkFailed:'Could not open the link in the default browser.',
  },
  pt: {
    tagline:'Selecione um vídeo para assistir', back:'Voltar', adminTitle:'Configurações',
    unlock:'Login', save:'Salvar', return:'Retornar',
    password:'Senha', wrongPw:'Senha incorreta — tente novamente.', saved:'Configurações salvas',
    videos:'Vídeos', appearance:'Aparência', language:'Idioma', security:'Segurança', about:'Sobre',
    selectAll:'Selecionar todos', deselectAll:'Desmarcar todos', scanFolder:'Escanear pasta\u2026',
    logo:'Logotipo', accentColor:'Cor de Destaque', theme:'Tema', dark:'Escuro', light:'Claro',
    changePw:'Alterar Senha', volume:'Volume', noVideos:'Nenhum vídeo para exibir',
    errTitle:'Não foi possível reproduzir', errMsg:'Arquivo ausente ou codec não suportado.', errBtn:'Voltar à biblioteca',
    showOnScreen:'Exibir na tela',
    openAdminToConfigure:'Abra as configurações de administrador para configurar sua biblioteca de vídeos.',
    displayedMedia:'Mídia exibida', languageLibrary:'Biblioteca de idiomas', chooseLanguageFolder:'Escolha qual pasta de idioma deseja gerenciar.',
    displayName:'Nome de exibição',
    noVideosLoaded:'Nenhum vídeo carregado. Use o botão Scan (canto superior direito) para escanear a pasta de mídia.',
    noLogoSet:'Nenhum logotipo definido', uploadLogo:'Enviar logotipo', remove:'Remover',
    logoHint:'Carregado automaticamente de assets/logo.png (também tenta .jpg e .svg). Envie abaixo para substituir.',
    accentNote:'Aplica-se a botões e contornos de foco. Os fundos permanecem neutros.',
    enterPasswordToContinue:'Digite sua senha para continuar',
    newPassword:'Nova senha', confirmPassword:'Confirmar senha',
    leaveBlankKeepCurrent:'Deixe em branco para manter a atual', repeatNewPassword:'Repita a nova senha',
    pwMin:'A senha deve ter pelo menos 4 caracteres.', pwMismatch:'As senhas não coincidem.', pwDigits:'A senha deve conter apenas numeros.',
    exit:'Sair',
    exitConfirm:'Sair do quiosque agora? Isso fechará a janela do quiosque e interromperá o servidor local.',
    exiting:'Saindo...',
    exitStillOpen:'O pedido de saída foi enviado, mas o quiosque ainda está aberto. Inicie novamente, se necessário, e tente sair de novo.',
    exitFailed:'Não foi possível sair do quiosque. Tente novamente.',
    scan:'Scan...', scanning:'Scan...',
    noVideosFound:'Nenhum vídeo encontrado. Atualize o manifesto de mídia e tente novamente.',
    videosFoundAcross:'{count} vídeos encontrados em {langs} idiomas', videosFound:'{count} vídeos encontrados',
    pickImageFile:'Selecione um arquivo de imagem.', imageUnder3mb:'A imagem deve ter menos de 3 MB.',
    viewMode:'Modo de visualização', viewCardsMedium:'Cartões (médio)', viewCardsLarge:'Cartões (maiores)', viewCardsSmall:'Cartões (menores)', viewListComfort:'Lista confortável', viewListCompact:'Lista compacta',
    aboutEyebrow:'Aplicativo de quiosque portátil', aboutDescription:'Quiosque de mídia em tela cheia para exposições, com reprodução multilíngue, controles administrativos e hospedagem local pronta para uso offline.',
    aboutImageFallback:'Imagem da marca indisponível', aboutVersion:'Versão', aboutBuildDate:'Data da compilação', aboutLicense:'Licença', aboutAuthor:'Autor',
    aboutGithub:'Ver no GitHub', aboutIssues:'Reportar um problema',
    aboutLinkFailed:'Não foi possível abrir o link no navegador padrão.',
  },
  es: {
    tagline:'Selecciona un video para ver', back:'Volver', adminTitle:'Configuración',
    unlock:'Iniciar sesión', save:'Guardar', return:'Regresar',
    password:'Contraseña', wrongPw:'Contraseña incorrecta — inténtalo de nuevo.', saved:'Configuración guardada',
    videos:'Videos', appearance:'Apariencia', language:'Idioma', security:'Seguridad', about:'Acerca de',
    selectAll:'Seleccionar todo', deselectAll:'Deseleccionar todo', scanFolder:'Escanear carpeta\u2026',
    logo:'Logotipo', accentColor:'Color de Acento', theme:'Tema', dark:'Oscuro', light:'Claro',
    changePw:'Cambiar Contraseña', volume:'Volumen', noVideos:'No hay videos',
    errTitle:'No se puede reproducir', errMsg:'Archivo no encontrado o códec no compatible.', errBtn:'Volver a la biblioteca',
    showOnScreen:'Mostrar en pantalla',
    openAdminToConfigure:'Abre la configuración de administrador para configurar tu biblioteca de videos.',
    displayedMedia:'Contenido mostrado', languageLibrary:'Biblioteca de idiomas', chooseLanguageFolder:'Elige qué carpeta de idioma quieres administrar.',
    displayName:'Nombre para mostrar',
    noVideosLoaded:'No hay videos cargados. Usa el botón Escanear (arriba a la derecha) para escanear la carpeta multimedia.',
    noLogoSet:'No hay logotipo', uploadLogo:'Subir logotipo', remove:'Quitar',
    logoHint:'Se carga automáticamente desde assets/logo.png (también prueba .jpg y .svg). Sube uno abajo para reemplazar.',
    accentNote:'Se aplica a botones y anillos de enfoque. Los fondos se mantienen neutros.',
    enterPasswordToContinue:'Introduce tu contraseña para continuar',
    newPassword:'Nueva contraseña', confirmPassword:'Confirmar contraseña',
    leaveBlankKeepCurrent:'Déjalo vacío para mantener la actual', repeatNewPassword:'Repite la nueva contraseña',
    pwMin:'La contraseña debe tener al menos 4 caracteres.', pwMismatch:'Las contraseñas no coinciden.', pwDigits:'La contrasena debe usar solo numeros.',
    exit:'Salir',
    exitConfirm:'¿Salir del kiosco ahora? Esto cerrará la ventana del kiosco y detendrá el servidor local.',
    exiting:'Saliendo...',
    exitStillOpen:'La solicitud de salida se envió, pero el kiosco sigue abierto. Vuelve a iniciarlo si hace falta e inténtalo de nuevo.',
    exitFailed:'No se pudo salir del kiosco. Inténtalo de nuevo.',
    scan:'Escanear...', scanning:'Escaneando...',
    noVideosFound:'No se encontraron videos. Actualiza el manifiesto multimedia y vuelve a intentarlo.',
    videosFoundAcross:'{count} videos encontrados en {langs} idiomas', videosFound:'{count} videos encontrados',
    pickImageFile:'Selecciona un archivo de imagen.', imageUnder3mb:'La imagen debe ser menor de 3 MB.',
    viewMode:'Modo de vista', viewCardsMedium:'Tarjetas (medio)', viewCardsLarge:'Tarjetas (más grandes)', viewCardsSmall:'Tarjetas (más pequeñas)', viewListComfort:'Lista cómoda', viewListCompact:'Lista compacta',
    aboutEyebrow:'Aplicación de kiosco portátil', aboutDescription:'Kiosco multimedia de pantalla completa para exposiciones, con reproducción multilingüe, controles administrativos y alojamiento local compatible con uso sin conexión.',
    aboutImageFallback:'Imagen de marca no disponible', aboutVersion:'Versión', aboutBuildDate:'Fecha de compilación', aboutLicense:'Licencia', aboutAuthor:'Autor',
    aboutGithub:'Ver en GitHub', aboutIssues:'Reportar un problema',
    aboutLinkFailed:'No se pudo abrir el enlace en el navegador predeterminado.',
  },
  fr: {
    tagline:'Sélectionnez une vidéo à regarder', back:'Retour', adminTitle:'Paramètres',
    unlock:'Se connecter', save:'Enregistrer', return:'Retour',
    password:'Mot de passe', wrongPw:'Mot de passe incorrect — réessayez.', saved:'Paramètres enregistrés',
    videos:'Vidéos', appearance:'Apparence', language:'Langue', security:'Sécurité', about:'À propos',
    selectAll:'Tout sélectionner', deselectAll:'Tout désélectionner', scanFolder:'Scanner le dossier\u2026',
    logo:'Logo', accentColor:"Couleur d'Accentuation", theme:'Thème', dark:'Sombre', light:'Clair',
    changePw:'Changer de Mot de Passe', volume:'Volume', noVideos:'Aucune vidéo à afficher',
    errTitle:'Impossible de lire', errMsg:'Fichier manquant ou codec non supporté.', errBtn:'Retour à la bibliothèque',
    showOnScreen:'Afficher à l\'écran',
    openAdminToConfigure:'Ouvrez les paramètres admin pour configurer votre vidéothèque.',
    displayedMedia:'Médias affichés', languageLibrary:'Bibliothèque de langues', chooseLanguageFolder:'Choisissez le dossier de langue à gérer.',
    displayName:'Nom affiché',
    noVideosLoaded:'Aucune vidéo chargée. Utilisez le bouton Scanner (en haut à droite) pour analyser le dossier média.',
    noLogoSet:'Aucun logo défini', uploadLogo:'Téléverser un logo', remove:'Supprimer',
    logoHint:'Chargé automatiquement depuis assets/logo.png (essaie aussi .jpg et .svg). Téléversez ci-dessous pour remplacer.',
    accentNote:'S\'applique aux boutons et anneaux de focus. Les arrière-plans restent neutres.',
    enterPasswordToContinue:'Entrez votre mot de passe pour continuer',
    newPassword:'Nouveau mot de passe', confirmPassword:'Confirmer le mot de passe',
    leaveBlankKeepCurrent:'Laissez vide pour conserver l\'actuel', repeatNewPassword:'Répétez le nouveau mot de passe',
    pwMin:'Le mot de passe doit comporter au moins 4 caractères.', pwMismatch:'Les mots de passe ne correspondent pas.', pwDigits:'Le mot de passe doit contenir uniquement des chiffres.',
    exit:'Quitter',
    exitConfirm:'Quitter le kiosque maintenant ? Cela fermera la fenêtre du kiosque et arrêtera le serveur local.',
    exiting:'Fermeture...',
    exitStillOpen:'La demande de fermeture a été envoyée, mais le kiosque est toujours ouvert. Relancez si nécessaire puis réessayez.',
    exitFailed:'Impossible de quitter le kiosque. Veuillez réessayer.',
    scan:'Scanner...', scanning:'Analyse...',
    noVideosFound:'Aucune vidéo trouvée. Actualisez le manifeste média et réessayez.',
    videosFoundAcross:'{count} vidéos trouvées dans {langs} langues', videosFound:'{count} vidéos trouvées',
    pickImageFile:'Veuillez sélectionner un fichier image.', imageUnder3mb:'L\'image doit faire moins de 3 Mo.',
    viewMode:'Mode d\'affichage', viewCardsMedium:'Cartes (moyen)', viewCardsLarge:'Cartes (plus grandes)', viewCardsSmall:'Cartes (plus petites)', viewListComfort:'Liste confortable', viewListCompact:'Liste compacte',
    aboutEyebrow:'Application kiosque portable', aboutDescription:'Kiosque multimédia plein écran pour expositions, avec lecture multilingue, contrôles d\'administration et hébergement local compatible hors ligne.',
    aboutImageFallback:'Image de marque indisponible', aboutVersion:'Version', aboutBuildDate:'Date de build', aboutLicense:'Licence', aboutAuthor:'Auteur',
    aboutGithub:'Voir sur GitHub', aboutIssues:'Signaler un problème',
    aboutLinkFailed:'Impossible d\'ouvrir le lien dans le navigateur par défaut.',
  },
  zh: {
    tagline:'选择视频观看', back:'返回', adminTitle:'展台设置',
    unlock:'登录', save:'保存', return:'返回',
    password:'密码', wrongPw:'密码错误，请重试。', saved:'设置已保存',
    videos:'视频', appearance:'外观', language:'语言', security:'安全', about:'关于',
    selectAll:'全选', deselectAll:'取消全选', scanFolder:'扫描文件夹\u2026',
    logo:'标志', accentColor:'强调色', theme:'主题', dark:'深色', light:'浅色',
    changePw:'修改密码', volume:'音量', noVideos:'没有可显示的视频',
    errTitle:'无法播放视频', errMsg:'文件缺失或不支持的编解码器。', errBtn:'返回库',
    showOnScreen:'在屏幕上显示',
    openAdminToConfigure:'打开管理员设置以配置视频库。',
    displayedMedia:'显示的媒体', languageLibrary:'语言媒体库', chooseLanguageFolder:'选择要管理的语言文件夹。',
    displayName:'显示名称',
    noVideosLoaded:'未加载视频。请使用右上角的扫描按钮扫描媒体文件夹。',
    noLogoSet:'未设置标志', uploadLogo:'上传标志', remove:'移除',
    logoHint:'会自动从 assets/logo.png 加载（也会尝试 .jpg 和 .svg）。可在下方上传覆盖。',
    accentNote:'应用于按钮和焦点边框，背景保持中性。',
    enterPasswordToContinue:'请输入密码以继续',
    newPassword:'新密码', confirmPassword:'确认密码',
    leaveBlankKeepCurrent:'留空则保留当前密码', repeatNewPassword:'再次输入新密码',
    pwMin:'密码至少需要 4 个字符。', pwMismatch:'两次密码不一致。', pwDigits:'密码只能包含数字。',
    exit:'退出',
    exitConfirm:'现在退出展台吗？这将关闭展台窗口并停止本地服务器。',
    exiting:'正在退出...',
    exitStillOpen:'已发送退出请求，但展台仍保持打开。如有需要，请重新启动后再次退出。',
    exitFailed:'无法退出展台，请重试。',
    scan:'扫描...', scanning:'正在扫描...',
    noVideosFound:'未找到视频。请刷新媒体清单后重试。',
    videosFoundAcross:'在 {langs} 种语言中找到 {count} 个视频', videosFound:'找到 {count} 个视频',
    pickImageFile:'请选择图像文件。', imageUnder3mb:'图像大小必须小于 3 MB。',
    viewMode:'视图模式', viewCardsMedium:'卡片（中等的）', viewCardsLarge:'卡片（更大）', viewCardsSmall:'卡片（更小）', viewListComfort:'舒适列表', viewListCompact:'紧凑列表',
    aboutEyebrow:'便携式展台应用', aboutDescription:'适用于展览的全屏媒体展台，支持多语言播放、管理控制以及适合离线使用的本地主机。',
    aboutImageFallback:'品牌图片不可用', aboutVersion:'版本', aboutBuildDate:'构建日期', aboutLicense:'许可证', aboutAuthor:'作者',
    aboutGithub:'在 GitHub 上查看', aboutIssues:'报告问题',
    aboutLinkFailed:'无法在默认浏览器中打开该链接。',
  },
};

/** @type {Object.<string, {space: string, enter: string, close: string}>} */
export const OSK_STRINGS = {
  en: { space: 'Space', enter: 'Enter', close: 'Close' },
  pt: { space: 'Espaco', enter: 'Entrar', close: 'Fechar' },
  es: { space: 'Espacio', enter: 'Entrar', close: 'Cerrar' },
  fr: { space: 'Espace', enter: 'Entrer', close: 'Fermer' },
  zh: { space: '空格', enter: '确认', close: '关闭' },
};

/** @type {Object.<string, {default: string|null, shift: string|null}>} */
export const OSK_EXTRA_ROWS = {
  en: { default: null, shift: null },
  zh: {
    default: '的 一 是 在 有 人 我 你 他 这 那 中 文 国 语 名 称 展 览 馆 厅 票',
    shift:   '了 不 和 为 上 个 们 来 到 时 大 地 子 出 会 可 也 对 生 能 而',
  },
  pt: {
    default: 'á é í ó ú à â ê ô ã õ ç',
    shift:   'Á É Í Ó Ú À Â Ê Ô Ã Õ Ç',
  },
  es: {
    default: 'á é í ó ú ü ñ',
    shift:   'Á É Í Ó Ú Ü Ñ',
  },
  fr: {
    default: 'à â æ ç é è ê ë î ï ô œ ù û ü ÿ',
    shift:   'À Â Æ Ç É È Ê Ë Î Ï Ô Œ Ù Û Ü Ÿ',
  },
};

/** @type {string} */
let currentLanguage = 'en';

/**
 * Get translated string for current language
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const langStrings = UI_STRINGS[currentLanguage] || UI_STRINGS.en;
  return langStrings[key] || UI_STRINGS.en[key] || key;
}

/**
 * Get translated string with variable substitution
 * @param {string} key
 * @param {Object} vars
 * @returns {string}
 */
export function tf(key, vars = {}) {
  return t(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/**
 * Set current language
 * @param {string} lang
 */
export function setLanguage(lang) {
  if (UI_STRINGS[lang]) {
    currentLanguage = lang;
  }
}

/**
 * Get current language
 * @returns {string}
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Map a language code to its actual media sub-folder name
 * @param {string} code
 * @returns {string}
 */
export function langFolder(code) {
  const l = LANGUAGES.find(x => x.code === code);
  return l ? l.folder : code;
}

/**
 * Apply translations to all elements with data-i18n attributes
 */
export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    el.setAttribute('placeholder', t(key));
  });
  document.documentElement.lang = currentLanguage;
}