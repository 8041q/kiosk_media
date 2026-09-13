/**
 * @file Internationalization strings and helpers
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', folder: 'en' },
  { code: 'zh', label: '中文', folder: 'zh' },
  { code: 'pt', label: 'Português', folder: 'pt' },
  { code: 'es', label: 'Español', folder: 'es' },
  { code: 'fr', label: 'Français', folder: 'fr' },
];

/**
 * @typedef {Object} UIStrings
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
 * @property {string} security
 * @property {string} about
 * @property {string} selectAll
 * @property {string} deselectAll
 * @property {string} logo
 * @property {string} accentColor
 * @property {string} theme
 * @property {string} dark
 * @property {string} light
 * @property {string} changePw
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
     back:'Back', adminTitle:'Kiosk Settings',
    unlock:'Login', save:'Save', return:'Return',
    password:'Password', wrongPw:'Incorrect password — try again.', saved:'Settings saved',
    videos:'Videos', appearance:'Appearance',  security:'Security', about:'About',
    selectAll:'Select all', deselectAll:'Deselect all',
    logo:'Logo', accentColor:'Accent Colour', theme:'Theme', dark:'Dark', light:'Light',
    changePw:'Change Password',  noVideos:'No videos to display',
    errTitle:'Cannot play this video', errMsg:'File missing or codec not supported.', errBtn:'Return to library',
    showOnScreen:'Show on screen',
    openAdminToConfigure:'Open admin settings to configure your video library.',
    displayedMedia:'Displayed Media', languageLibrary:'Language library', chooseLanguageFolder:'Choose which language folder you want to manage.',
    displayName:'Display name',
    noVideosLoaded:'No videos loaded. Use the Scan button (top right) to scan the media folder.',
    noLogoSet:'No logo set', uploadLogo:'Upload logo', remove:'Remove',
    logoHint:'Auto-loaded from assets/logo.png (also tries .jpg and .svg). Upload below to override.',
    accentNote:'Applies to buttons and active controls. Backgrounds stay neutral.',
    enterPasswordToContinue:'Enter your password to continue',
    newPassword:'New password', confirmPassword:'Confirm password',
    leaveBlankKeepCurrent:'Leave blank to keep current', repeatNewPassword:'Repeat new password',
    pwMin:'Password must be at least 4 characters.', pwMismatch:'Passwords do not match.', pwDigits:'Password must use numbers only.',
    exit:'Exit',
    exitConfirm:'Exit kiosk now? This will close the kiosk window and stop the local server.',
    exiting:'Exiting...',

    exitFailed:'Could not exit kiosk. Please try again.',
    scan:'Scan...', scanning:'Scanning...',
    noVideosFound:'No videos found. Check the media folders and scan again.',
    videosFoundAcross:'{count} videos found across {langs} languages', videosFound:'{count} videos found',
    pickImageFile:'Please select an image file.', imageUnder3mb:'Image must be under 3 MB.',
    viewMode:'View Mode', viewCardsMedium:'Card size (medium)', viewCardsLarge:'Cards (larger)', viewCardsSmall:'Cards (smaller)', viewListComfort:'Comfortable list', viewListCompact:'Compact list',
    videoProcessing:'Video Processing',



      fixFailed:'Processing failed', saveFailed:'Could not save settings',
    videoProcessingSubtitle:'Check the library for videos that need compatibility fixes before playback.', processingGuideTitle:'Compatibility repair, not general compression', processingGuideBody:'Only videos that need changes to play reliably in the kiosk can be processed. Videos that already work are left untouched, regardless of file size. The profile below only controls the quality and file-size tradeoff when conversion is actually required.', processingGuideDetail:'Optimize can reorganize a compatible file without re-encoding. Transcode converts unsupported video or audio formats into a player-compatible format.', total:'Total',
    mediaHealth:'Media health', analyzeLibrary:'Analyse library', analyzing:'Analysing...', lastAnalyzed:'Last analysed',
    statusReady:'Ready', statusOptimize:'Optimize', statusTranscode:'Transcode', statusError:'Error',
    processingProfile:'Processing profile', profileRecommended:'Recommended', profileHigh:'High quality', profileSmaller:'Smaller files',
    profileRecommendedHelp:'Balanced for most displays: keeps good image quality while reducing file size moderately. A safe default for exhibitions.',
    profileHighHelp:'Preserves more image detail with lighter compression, but creates larger files and uses more storage and bandwidth.',
    profileSmallerHelp:'Reduces file size more aggressively to save storage and improve loading, at the cost of some visible image quality.',
    filterAll:'All', filterAttention:'Needs attention', filterReady:'Ready', filterErrors:'Errors', filterProcessed:'Processed', filterUnprocessed:'Unprocessed',
    selectAttention:'Select all needing attention', processSelected:'Process selected', willProcess:'Will process', skipped:'Skipped', noAttention:'No unprocessed videos found.',
     actionRemux:'Optimize without quality loss', actionTranscode:'Transcode for kiosk compatibility',
       technicalLog:'Technical log',
    processingProgress:'Processing', cancelProcessing:'Cancel', processingComplete:'Processing complete', processingCancelled:'Processing cancelled',

    aboutEyebrow:'Portable kiosk app', aboutDescription:'Fullscreen media kiosk for exhibitions with multilingual playback, admin controls, and local offline-friendly hosting.',
    aboutImageFallback:'Brand image unavailable', aboutVersion:'Version', aboutBuildDate:'Build date', aboutLicense:'License', aboutAuthor:'Author',
    aboutGithub:'View on GitHub', aboutIssues:'Report an issue',
    aboutLinkFailed:'Could not open the link in the default browser.',
  },
  pt: {
     back:'Voltar', adminTitle:'Configurações',
    unlock:'Login', save:'Salvar', return:'Retornar',
    password:'Senha', wrongPw:'Senha incorreta — tente novamente.', saved:'Configurações salvas',
    videos:'Vídeos', appearance:'Aparência',  security:'Segurança', about:'Sobre',
    selectAll:'Selecionar todos', deselectAll:'Desmarcar todos',
    logo:'Logotipo', accentColor:'Cor de Destaque', theme:'Tema', dark:'Escuro', light:'Claro',
    changePw:'Alterar Senha',  noVideos:'Nenhum vídeo para exibir',
    errTitle:'Não foi possível reproduzir', errMsg:'Arquivo ausente ou codec não suportado.', errBtn:'Voltar à biblioteca',
    showOnScreen:'Exibir na tela',
    openAdminToConfigure:'Abra as configurações de administrador para configurar sua biblioteca de vídeos.',
    displayedMedia:'Mídia exibida', languageLibrary:'Biblioteca de idiomas', chooseLanguageFolder:'Escolha qual pasta de idioma deseja gerenciar.',
    displayName:'Nome de exibição',
    noVideosLoaded:'Nenhum vídeo carregado. Use o botão Scan (canto superior direito) para escanear a pasta de mídia.',
    noLogoSet:'Nenhum logotipo definido', uploadLogo:'Enviar logotipo', remove:'Remover',
    logoHint:'Carregado automaticamente de assets/logo.png (também tenta .jpg e .svg). Envie abaixo para substituir.',
    accentNote:'Aplica-se a botões e controlos ativos. Os fundos permanecem neutros.',
    enterPasswordToContinue:'Digite sua senha para continuar',
    newPassword:'Nova senha', confirmPassword:'Confirmar senha',
    leaveBlankKeepCurrent:'Deixe em branco para manter a atual', repeatNewPassword:'Repita a nova senha',
    pwMin:'A senha deve ter pelo menos 4 caracteres.', pwMismatch:'As senhas não coincidem.', pwDigits:'A senha deve conter apenas numeros.',
    exit:'Sair',
    exitConfirm:'Sair do quiosque agora? Isso fechará a janela do quiosque e interromperá o servidor local.',
    exiting:'Saindo...',

    exitFailed:'Não foi possível sair do quiosque. Tente novamente.',
    scan:'Escanear...', scanning:'Escaneando...',
    noVideosFound:'Nenhum vídeo encontrado. Verifique as pastas de mídia e escaneie novamente.',
    videosFoundAcross:'{count} vídeos encontrados em {langs} idiomas', videosFound:'{count} vídeos encontrados',
    pickImageFile:'Selecione um arquivo de imagem.', imageUnder3mb:'A imagem deve ter menos de 3 MB.',
    viewMode:'Modo de visualização', viewCardsMedium:'Cartões (médio)', viewCardsLarge:'Cartões (maiores)', viewCardsSmall:'Cartões (menores)', viewListComfort:'Lista confortável', viewListCompact:'Lista compacta',
    videoProcessing:'Processamento de Vídeo',



      fixFailed:'Falha no processamento', saveFailed:'Não foi possível salvar as configurações',
    videoProcessingSubtitle:'Verifique a biblioteca para encontrar vídeos que precisam de correções de compatibilidade antes da reprodução.', processingGuideTitle:'Correção de compatibilidade, não compressão geral', processingGuideBody:'Apenas vídeos que precisam de alterações para reproduzir de forma fiável no quiosque podem ser processados. Vídeos que já funcionam ficam inalterados, independentemente do tamanho do ficheiro. O perfil abaixo só controla o equilíbrio entre qualidade e tamanho quando a conversão é realmente necessária.', processingGuideDetail:'Otimizar pode reorganizar um ficheiro compatível sem recodificar. Transcodificar converte formatos de vídeo ou áudio não suportados para um formato compatível com o leitor.', total:'Total',
    mediaHealth:'Estado da mídia', analyzeLibrary:'Analisar biblioteca', analyzing:'Analisando...', lastAnalyzed:'Última análise',
    statusReady:'Pronto', statusOptimize:'Otimizar', statusTranscode:'Transcodificar', statusError:'Erro',
    processingProfile:'Perfil de processamento', profileRecommended:'Recomendado', profileHigh:'Alta qualidade', profileSmaller:'Arquivos menores',
    profileRecommendedHelp:'Equilíbrio ideal para a maioria dos ecrãs: mantém boa qualidade de imagem e reduz moderadamente o tamanho dos ficheiros.',
    profileHighHelp:'Preserva mais detalhe de imagem com compressão mais leve, mas cria ficheiros maiores e usa mais armazenamento e largura de banda.',
    profileSmallerHelp:'Reduz o tamanho dos ficheiros de forma mais agressiva para poupar espaço e carregar mais rápido, com alguma perda visível de qualidade.',
    filterAll:'Todos', filterAttention:'Requer atenção', filterReady:'Prontos', filterErrors:'Erros', filterProcessed:'Processados', filterUnprocessed:'Não processados',
    selectAttention:'Selecionar todos que requerem atenção', processSelected:'Processar selecionados', willProcess:'Será processado', skipped:'Ignorado', noAttention:'Nenhum vídeo não processado encontrado.',
     actionRemux:'Otimizar sem perda de qualidade', actionTranscode:'Transcodificar para compatibilidade com o quiosque',
       technicalLog:'Log técnico',
    processingProgress:'Processando', cancelProcessing:'Cancelar', processingComplete:'Processamento concluído', processingCancelled:'Processamento cancelado',
    aboutEyebrow:'Aplicativo de quiosque portátil', aboutDescription:'Quiosque de mídia em tela cheia para exposições, com reprodução multilíngue, controles administrativos e hospedagem local pronta para uso offline.',
    aboutImageFallback:'Imagem da marca indisponível', aboutVersion:'Versão', aboutBuildDate:'Data da compilação', aboutLicense:'Licença', aboutAuthor:'Autor',
    aboutGithub:'Ver no GitHub', aboutIssues:'Reportar um problema',
    aboutLinkFailed:'Não foi possível abrir o link no navegador padrão.',
  },
  es: {
     back:'Volver', adminTitle:'Configuración',
    unlock:'Iniciar sesión', save:'Guardar', return:'Regresar',
    password:'Contraseña', wrongPw:'Contraseña incorrecta — inténtalo de nuevo.', saved:'Configuración guardada',
    videos:'Videos', appearance:'Apariencia',  security:'Seguridad', about:'Acerca de',
    selectAll:'Seleccionar todo', deselectAll:'Deseleccionar todo',
    logo:'Logotipo', accentColor:'Color de Acento', theme:'Tema', dark:'Oscuro', light:'Claro',
    changePw:'Cambiar Contraseña',  noVideos:'No hay videos',
    errTitle:'No se puede reproducir', errMsg:'Archivo no encontrado o códec no compatible.', errBtn:'Volver a la biblioteca',
    showOnScreen:'Mostrar en pantalla',
    openAdminToConfigure:'Abre la configuración de administrador para configurar tu biblioteca de videos.',
    displayedMedia:'Contenido mostrado', languageLibrary:'Biblioteca de idiomas', chooseLanguageFolder:'Elige qué carpeta de idioma quieres administrar.',
    displayName:'Nombre para mostrar',
    noVideosLoaded:'No hay videos cargados. Usa el botón Escanear (arriba a la derecha) para escanear la carpeta multimedia.',
    noLogoSet:'No hay logotipo', uploadLogo:'Subir logotipo', remove:'Quitar',
    logoHint:'Se carga automáticamente desde assets/logo.png (también prueba .jpg y .svg). Sube uno abajo para reemplazar.',
    accentNote:'Se aplica a botones y controles activos. Los fondos se mantienen neutros.',
    enterPasswordToContinue:'Introduce tu contraseña para continuar',
    newPassword:'Nueva contraseña', confirmPassword:'Confirmar contraseña',
    leaveBlankKeepCurrent:'Déjalo vacío para mantener la actual', repeatNewPassword:'Repite la nueva contraseña',
    pwMin:'La contraseña debe tener al menos 4 caracteres.', pwMismatch:'Las contraseñas no coinciden.', pwDigits:'La contrasena debe usar solo numeros.',
    exit:'Salir',
    exitConfirm:'¿Salir del kiosco ahora? Esto cerrará la ventana del kiosco y detendrá el servidor local.',
    exiting:'Saliendo...',

    exitFailed:'No se pudo salir del kiosco. Inténtalo de nuevo.',
    scan:'Escanear...', scanning:'Escaneando...',
    noVideosFound:'No se encontraron videos. Revisa las carpetas multimedia y vuelve a escanear.',
    videosFoundAcross:'{count} videos encontrados en {langs} idiomas', videosFound:'{count} videos encontrados',
    pickImageFile:'Selecciona un archivo de imagen.', imageUnder3mb:'La imagen debe ser menor de 3 MB.',
    viewMode:'Modo de vista', viewCardsMedium:'Tarjetas (medio)', viewCardsLarge:'Tarjetas (más grandes)', viewCardsSmall:'Tarjetas (más pequeñas)', viewListComfort:'Lista cómoda', viewListCompact:'Lista compacta',
    videoProcessing:'Procesamiento de Video',



      fixFailed:'Falló el procesamiento', saveFailed:'No se pudo guardar la configuración',
    videoProcessingSubtitle:'Comprueba la biblioteca para detectar videos que necesitan correcciones de compatibilidad antes de reproducirse.', processingGuideTitle:'Reparación de compatibilidad, no compresión general', processingGuideBody:'Solo se pueden procesar los videos que necesitan cambios para reproducirse correctamente en el kiosco. Los videos que ya funcionan se dejan intactos, sin importar su tamaño. El perfil inferior solo controla el equilibrio entre calidad y tamaño cuando la conversión es realmente necesaria.', processingGuideDetail:'Optimizar puede reorganizar un archivo compatible sin volver a codificarlo. Transcodificar convierte formatos de video o audio no compatibles a un formato compatible con el reproductor.', total:'Total',
    mediaHealth:'Estado multimedia', analyzeLibrary:'Analizar biblioteca', analyzing:'Analizando...', lastAnalyzed:'Último análisis',
    statusReady:'Listo', statusOptimize:'Optimizar', statusTranscode:'Transcodificar', statusError:'Error',
    processingProfile:'Perfil de procesamiento', profileRecommended:'Recomendado', profileHigh:'Alta calidad', profileSmaller:'Archivos más pequeños',
    profileRecommendedHelp:'Equilibrado para la mayoría de pantallas: mantiene buena calidad de imagen y reduce moderadamente el tamaño de los archivos.',
    profileHighHelp:'Conserva más detalle con una compresión más ligera, pero genera archivos más grandes y usa más almacenamiento y ancho de banda.',
    profileSmallerHelp:'Reduce el tamaño de los archivos de forma más agresiva para ahorrar espacio y cargar más rápido, a costa de algo de calidad visible.',
    filterAll:'Todos', filterAttention:'Requiere atención', filterReady:'Listos', filterErrors:'Errores', filterProcessed:'Procesados', filterUnprocessed:'Sin procesar',
    selectAttention:'Seleccionar todos los que requieren atención', processSelected:'Procesar seleccionados', willProcess:'Se procesará', skipped:'Omitido', noAttention:'No se encontraron videos sin procesar.',
     actionRemux:'Optimizar sin pérdida de calidad', actionTranscode:'Transcodificar para compatibilidad con el kiosco',
       technicalLog:'Registro técnico',
    processingProgress:'Procesando', cancelProcessing:'Cancelar', processingComplete:'Procesamiento completado', processingCancelled:'Procesamiento cancelado',
    aboutEyebrow:'Aplicación de kiosco portátil', aboutDescription:'Kiosco multimedia de pantalla completa para exposiciones, con reproducción multilingüe, controles administrativos y alojamiento local compatible con uso sin conexión.',
    aboutImageFallback:'Imagen de marca no disponible', aboutVersion:'Versión', aboutBuildDate:'Fecha de compilación', aboutLicense:'Licencia', aboutAuthor:'Autor',
    aboutGithub:'Ver en GitHub', aboutIssues:'Reportar un problema',
    aboutLinkFailed:'No se pudo abrir el enlace en el navegador predeterminado.',
  },
  fr: {
     back:'Retour', adminTitle:'Paramètres',
    unlock:'Se connecter', save:'Enregistrer', return:'Retour',
    password:'Mot de passe', wrongPw:'Mot de passe incorrect — réessayez.', saved:'Paramètres enregistrés',
    videos:'Vidéos', appearance:'Apparence',  security:'Sécurité', about:'À propos',
    selectAll:'Tout sélectionner', deselectAll:'Tout désélectionner',
    logo:'Logo', accentColor:"Couleur d'Accentuation", theme:'Thème', dark:'Sombre', light:'Clair',
    changePw:'Changer de Mot de Passe',  noVideos:'Aucune vidéo à afficher',
    errTitle:'Impossible de lire', errMsg:'Fichier manquant ou codec non supporté.', errBtn:'Retour à la bibliothèque',
    showOnScreen:'Afficher à l\'écran',
    openAdminToConfigure:'Ouvrez les paramètres admin pour configurer votre vidéothèque.',
    displayedMedia:'Médias affichés', languageLibrary:'Bibliothèque de langues', chooseLanguageFolder:'Choisissez le dossier de langue à gérer.',
    displayName:'Nom affiché',
    noVideosLoaded:'Aucune vidéo chargée. Utilisez le bouton Scanner (en haut à droite) pour analyser le dossier média.',
    noLogoSet:'Aucun logo défini', uploadLogo:'Téléverser un logo', remove:'Supprimer',
    logoHint:'Chargé automatiquement depuis assets/logo.png (essaie aussi .jpg et .svg). Téléversez ci-dessous pour remplacer.',
    accentNote:'S\'applique aux boutons et contrôles actifs. Les arrière-plans restent neutres.',
    enterPasswordToContinue:'Entrez votre mot de passe pour continuer',
    newPassword:'Nouveau mot de passe', confirmPassword:'Confirmer le mot de passe',
    leaveBlankKeepCurrent:'Laissez vide pour conserver l\'actuel', repeatNewPassword:'Répétez le nouveau mot de passe',
    pwMin:'Le mot de passe doit comporter au moins 4 caractères.', pwMismatch:'Les mots de passe ne correspondent pas.', pwDigits:'Le mot de passe doit contenir uniquement des chiffres.',
    exit:'Quitter',
    exitConfirm:'Quitter le kiosque maintenant ? Cela fermera la fenêtre du kiosque et arrêtera le serveur local.',
    exiting:'Fermeture...',

    exitFailed:'Impossible de quitter le kiosque. Veuillez réessayer.',
    scan:'Scanner...', scanning:'Analyse...',
    noVideosFound:'Aucune vidéo trouvée. Vérifiez les dossiers multimédias et relancez l’analyse.',
    videosFoundAcross:'{count} vidéos trouvées dans {langs} langues', videosFound:'{count} vidéos trouvées',
    pickImageFile:'Veuillez sélectionner un fichier image.', imageUnder3mb:'L\'image doit faire moins de 3 Mo.',
    viewMode:'Mode d\'affichage', viewCardsMedium:'Cartes (moyen)', viewCardsLarge:'Cartes (plus grandes)', viewCardsSmall:'Cartes (plus petites)', viewListComfort:'Liste confortable', viewListCompact:'Liste compacte',
    videoProcessing:'Traitement Vidéo',



      fixFailed:'Échec du traitement', saveFailed:'Impossible d’enregistrer les paramètres',
    videoProcessingSubtitle:'Vérifiez la médiathèque pour repérer les vidéos qui nécessitent une correction de compatibilité avant la lecture.', processingGuideTitle:'Correction de compatibilité, pas compression générale', processingGuideBody:'Seules les vidéos qui doivent être modifiées pour être lues correctement dans le kiosque peuvent être traitées. Les vidéos déjà compatibles restent inchangées, quelle que soit leur taille. Le profil ci-dessous ne règle le compromis qualité/taille que lorsqu’une conversion est réellement nécessaire.', processingGuideDetail:'Optimiser peut réorganiser un fichier compatible sans réencodage. Transcoder convertit les formats vidéo ou audio non pris en charge vers un format compatible avec le lecteur.', total:'Total',
    mediaHealth:'État des médias', analyzeLibrary:'Analyser la médiathèque', analyzing:'Analyse...', lastAnalyzed:'Dernière analyse',
    statusReady:'Prêt', statusOptimize:'Optimiser', statusTranscode:'Transcoder', statusError:'Erreur',
    processingProfile:'Profil de traitement', profileRecommended:'Recommandé', profileHigh:'Haute qualité', profileSmaller:'Fichiers plus petits',
    profileRecommendedHelp:'Équilibré pour la plupart des écrans : conserve une bonne qualité d’image tout en réduisant modérément la taille des fichiers.',
    profileHighHelp:'Préserve davantage de détails avec une compression plus légère, mais produit des fichiers plus volumineux et utilise plus de stockage et de bande passante.',
    profileSmallerHelp:'Réduit plus fortement la taille des fichiers pour économiser de l’espace et accélérer le chargement, au prix d’une légère perte de qualité visible.',
    filterAll:'Tous', filterAttention:'À traiter', filterReady:'Prêts', filterErrors:'Erreurs', filterProcessed:'Traités', filterUnprocessed:'Non traités',
    selectAttention:'Sélectionner tous les éléments à traiter', processSelected:'Traiter la sélection', willProcess:'Sera traité', skipped:'Ignoré', noAttention:'Aucune vidéo non traitée trouvée.',
     actionRemux:'Optimiser sans perte de qualité', actionTranscode:'Transcoder pour la compatibilité du kiosque',
       technicalLog:'Journal technique',
    processingProgress:'Traitement', cancelProcessing:'Annuler', processingComplete:'Traitement terminé', processingCancelled:'Traitement annulé',
    aboutEyebrow:'Application kiosque portable', aboutDescription:'Kiosque multimédia plein écran pour expositions, avec lecture multilingue, contrôles d\'administration et hébergement local compatible hors ligne.',
    aboutImageFallback:'Image de marque indisponible', aboutVersion:'Version', aboutBuildDate:'Date de build', aboutLicense:'Licence', aboutAuthor:'Auteur',
    aboutGithub:'Voir sur GitHub', aboutIssues:'Signaler un problème',
    aboutLinkFailed:'Impossible d\'ouvrir le lien dans le navigateur par défaut.',
  },
  zh: {
     back:'返回', adminTitle:'展台设置',
    unlock:'登录', save:'保存', return:'返回',
    password:'密码', wrongPw:'密码错误，请重试。', saved:'设置已保存',
    videos:'视频', appearance:'外观',  security:'安全', about:'关于',
    selectAll:'全选', deselectAll:'取消全选',
    logo:'标志', accentColor:'强调色', theme:'主题', dark:'深色', light:'浅色',
    changePw:'修改密码',  noVideos:'没有可显示的视频',
    errTitle:'无法播放视频', errMsg:'文件缺失或不支持的编解码器。', errBtn:'返回库',
    showOnScreen:'在屏幕上显示',
    openAdminToConfigure:'打开管理员设置以配置视频库。',
    displayedMedia:'显示的媒体', languageLibrary:'语言媒体库', chooseLanguageFolder:'选择要管理的语言文件夹。',
    displayName:'显示名称',
    noVideosLoaded:'未加载视频。请使用右上角的扫描按钮扫描媒体文件夹。',
    noLogoSet:'未设置标志', uploadLogo:'上传标志', remove:'移除',
    logoHint:'会自动从 assets/logo.png 加载（也会尝试 .jpg 和 .svg）。可在下方上传覆盖。',
    accentNote:'应用于按钮和活动控件，背景保持中性。',
    enterPasswordToContinue:'请输入密码以继续',
    newPassword:'新密码', confirmPassword:'确认密码',
    leaveBlankKeepCurrent:'留空则保留当前密码', repeatNewPassword:'再次输入新密码',
    pwMin:'密码至少需要 4 个字符。', pwMismatch:'两次密码不一致。', pwDigits:'密码只能包含数字。',
    exit:'退出',
    exitConfirm:'现在退出展台吗？这将关闭展台窗口并停止本地服务器。',
    exiting:'正在退出...',

    exitFailed:'无法退出展台，请重试。',
    scan:'扫描...', scanning:'正在扫描...',
    noVideosFound:'未找到视频。请检查媒体文件夹后重新扫描。',
    videosFoundAcross:'在 {langs} 种语言中找到 {count} 个视频', videosFound:'找到 {count} 个视频',
    pickImageFile:'请选择图像文件。', imageUnder3mb:'图像大小必须小于 3 MB。',
    viewMode:'视图模式', viewCardsMedium:'卡片（中等的）', viewCardsLarge:'卡片（更大）', viewCardsSmall:'卡片（更小）', viewListComfort:'舒适列表', viewListCompact:'紧凑列表',
    videoProcessing:'视频处理',



      fixFailed:'处理失败', saveFailed:'无法保存设置',
    videoProcessingSubtitle:'检查媒体库中哪些视频在播放前需要兼容性修复。', processingGuideTitle:'用于兼容性修复，而不是通用压缩', processingGuideBody:'只有为确保在展台中可靠播放而需要修改的视频才能处理。已经可以正常播放的视频会保持不变，无论文件有多大。下面的处理配置只在确实需要转换时决定画质与文件大小之间的取舍。', processingGuideDetail:'“优化”可以在不重新编码的情况下重组兼容文件；“转码”会把不受支持的视频或音频格式转换为播放器兼容格式。', total:'总数',
    mediaHealth:'媒体状态', analyzeLibrary:'分析媒体库', analyzing:'正在分析...', lastAnalyzed:'上次分析',
    statusReady:'就绪', statusOptimize:'优化', statusTranscode:'转码', statusError:'错误',
    processingProfile:'处理配置', profileRecommended:'推荐', profileHigh:'高质量', profileSmaller:'更小文件',
    profileRecommendedHelp:'适合大多数显示场景：在保持良好画质的同时适度减小文件大小，是展览播放的稳妥默认选项。',
    profileHighHelp:'采用更轻的压缩以保留更多画面细节，但会生成更大的文件，并占用更多存储空间和带宽。',
    profileSmallerHelp:'更积极地压缩文件，以节省存储并加快加载，但会牺牲一定的可见画质。',
    filterAll:'全部', filterAttention:'需要处理', filterReady:'就绪', filterErrors:'错误', filterProcessed:'已处理', filterUnprocessed:'未处理',
    selectAttention:'选择所有需要处理的视频', processSelected:'处理所选视频', willProcess:'将处理', skipped:'已跳过', noAttention:'没有未处理的视频。',
     actionRemux:'无损优化', actionTranscode:'转码以兼容展台',
       technicalLog:'技术日志',
    processingProgress:'处理中', cancelProcessing:'取消', processingComplete:'处理完成', processingCancelled:'处理已取消',
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