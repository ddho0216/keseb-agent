// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// ---------- 13단계: 로그인 사용자·기기·세션 표시 ----------
// 입력은 { me, devices, sessions } 이고 각각 { status, mode, data?, error? } 입니다.
// DOM 은 createElement 와 textContent 로만 만듭니다. 함수는 이전 값을 기억하지 않으므로
// 다시 불러올 때마다 새 입력으로 처음부터 그리고, 오류일 때 이전 사용자 정보가 남지 않습니다.
const DEVICE_STATUS = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
const MODE_NOTE = { demo: '예제 자료 (실제 연결 아님)', disconnected: '연결 없음', unknown: '확인 불가 (연결 상태)' };
const CONTRACT_ERROR_CODES = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'];

function make(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

const isText = value => typeof value === 'string' && value.length > 0;
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// 이름과 ID 를 함께 보여 줍니다. 이름이 없으면 ID 만, 둘 다 없으면 정보 없음입니다.
function nameWithId(item) {
  if (!isObject(item)) return '정보 없음';
  if (isText(item.label) && isText(item.id)) return `${item.label} (${item.id})`;
  return isText(item.label) ? item.label : (isText(item.id) ? item.id : '정보 없음');
}

// 상태는 한국어 뜻과 원래 값을 함께 보여 줍니다. 정상이 아닌 값은 글자로 주의를 붙여 정상처럼 읽히지 않게 합니다.
function statusText(labels, normal, value) {
  const known = isText(value) && Object.hasOwn(labels, value);
  const raw = isText(value) ? value.slice(0, 40) : '값 없음';
  if (known && value === normal) return `${labels[value]}(${value})`;
  if (known && value !== 'unknown') return `[주의] ${labels[value]}(${value})`;
  return `[확인 필요] ${known ? labels[value] : '확인 불가'}(${raw})`;
}

// 로딩 중에는 아직 모드를 모를 수 있어 지어내지 않습니다. 응답이 끝났는데 모드가 없거나 이상하면 확인 불가입니다.
function modeNote(resource) {
  const mode = resource.mode;
  if (mode === 'connected') return null;
  if (isText(mode) && Object.hasOwn(MODE_NOTE, mode)) return { mode, text: MODE_NOTE[mode] };
  return resource.status === 'loading' ? null : { mode: 'unknown', text: MODE_NOTE.unknown };
}

// 자료 하나(me·devices·sessions)를 구역 하나로 그립니다. 상태별 문구는 여기서 한 번만 정합니다.
function identitySection(title, resource, renderOk) {
  const section = make('section');
  section.setAttribute('aria-label', title);
  section.append(make('h3', title));
  if (!isObject(resource)) {
    section.append(make('p', '확인 불가: 입력을 받지 못했습니다.'));
    return section;
  }
  const note = modeNote(resource);
  if (note) section.append(make('p', note.text, note.mode === 'demo' ? 'tag tag-demo' : 'muted'));
  if (resource.status === 'loading') {
    section.append(make('p', '불러오는 중'));
  } else if (resource.status === 'error') {
    const error = isObject(resource.error) ? resource.error : {};
    const message = isText(error.message) ? error.message : '서버가 사유를 알려 주지 않았습니다.';
    const prefix = CONTRACT_ERROR_CODES.includes(error.code) ? '확인 불가' : '연결 실패';
    section.append(make('p', `${prefix}: ${message}`));
  } else if (resource.status === 'ok') {
    section.append(renderOk(resource.data) || make('p', '확인 불가: 서버 응답 형식이 맞지 않습니다.'));
  } else {
    section.append(make('p', '확인 불가: 알 수 없는 상태입니다.'));
  }
  return section;
}

function currentAccount(data) {
  if (!isObject(data) || !isObject(data.user) || !isObject(data.device) || !isObject(data.session)) return null;
  const list = make('dl');
  const rows = [
    ['사용자', nameWithId(data.user)],
    ['현재 기기', `${nameWithId(data.device)} · ${statusText(DEVICE_STATUS, 'compliant', data.device.status)}`],
    ['현재 세션', `${isText(data.session.id) ? data.session.id : '정보 없음'} · ${statusText(SESSION_STATUS, 'active', data.session.status)}`],
  ];
  for (const [term, value] of rows) list.append(make('dt', term), make('dd', value));
  return list;
}

function ownedList(items, emptyText, describe) {
  if (!Array.isArray(items)) return null;
  if (items.length === 0) return make('p', emptyText);
  const list = make('ul');
  for (const item of items) {
    if (!isObject(item)) return null;
    list.append(make('li', describe(item)));
  }
  return list;
}

function identityView({ me, devices, sessions } = {}) {
  const meData = isObject(me) && me.status === 'ok' && isObject(me.data) ? me.data : null;
  const currentDeviceId = meData && isObject(meData.device) ? meData.device.id : undefined;
  const currentSessionId = meData && isObject(meData.session) ? meData.session.id : undefined;
  const root = make('div', undefined, 'student-identity');
  root.append(
    identitySection('내 계정·현재 기기·현재 세션', me, currentAccount),
    identitySection('내 기기 목록', devices, data => ownedList(data, '표시할 기기가 없습니다.', device =>
      `${nameWithId(device)} · ${statusText(DEVICE_STATUS, 'compliant', device.status)}${isText(device.id) && device.id === currentDeviceId ? ' · 현재 기기' : ''}`)),
    identitySection('내 세션 목록', sessions, data => ownedList(data, '표시할 세션이 없습니다.', session =>
      `${isText(session.id) ? session.id : '정보 없음'} · ${statusText(SESSION_STATUS, 'active', session.status)}${isText(session.id) && session.id === currentSessionId ? ' · 현재 세션' : ''}`)),
    make('p', '기기 보안 상태 표시는 악성코드 검사나 치료 기능이 아닙니다.', 'muted'),
  );
  return root;
}

// ---------- 14단계: 업무 앱 접속 판정 표시 ----------
// 입력은 { status, mode, data?, error?, appId } 이고 data 는 { appId, decision, reason, checkedAt } 입니다.
// status 는 idle(요청 전)·loading·ok·error 입니다. 판정 4가지와 요청 실패를 글자로 서로 구분합니다.
// 요청 실패·확인 불가는 접근 거부 판정이 아니고, 접근이 가능했다는 뜻으로도 읽히지 않게 씁니다.
const DECISION = {
  allow: { label: '접근 허용', note: '정책상 접근이 허용되었다는 판정입니다. 실제 앱 접속 성공을 보장하지는 않습니다.' },
  deny: { label: '접근 거부', note: '정책에 따라 접근이 거부되었습니다.' },
  challenge: { label: '추가 인증 또는 확인 필요', note: '접근 전에 추가 인증이나 확인이 필요합니다. 이 화면은 그 확인 절차를 대신 수행하지 않습니다.' },
  unknown: { label: '판정 확인 불가', note: '판정을 확인할 수 없어 접근 가능 여부를 알 수 없습니다.' },
};

// 판정 시각은 서버가 준 원래 값을 그대로 적고, 읽을 수 있으면 한국 시각을 괄호로 덧붙입니다.
function checkedAtText(value) {
  if (!isText(value)) return '판정 시각 정보 없음';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return value;
  return `${value} (한국 시각 ${time.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`;
}

function decisionResult(input) {
  const data = input.data;
  if (!isObject(data)) return { unverified: '서버 응답 형식이 맞지 않습니다.' };
  // 요청한 앱과 다른 앱의 결과를 이 앱의 판정으로 보여 주지 않습니다.
  if (isText(input.appId) && data.appId !== input.appId) return { unverified: '요청한 앱과 다른 앱의 판정 결과라 표시하지 않습니다.' };
  const known = isText(data.decision) && Object.hasOwn(DECISION, data.decision);
  return { known, code: known ? data.decision : 'unknown', raw: data.decision, data };
}

function decisionView(input) {
  const section = make('section', undefined, 'student-decision');
  section.setAttribute('aria-label', '업무 앱 접속 판정');
  if (!isObject(input)) {
    section.append(make('p', '확인 불가: 입력을 받지 못했습니다. 접근 가능 여부를 알 수 없습니다.'));
    return section;
  }
  const appText = isText(input.appId) ? `앱 ${input.appId}` : null;
  // 요청 전에는 모드를 알 수 없으므로 모드 안내를 붙이지 않습니다.
  const note = input.status === 'idle' ? null : modeNote(input);
  if (note) section.append(make('p', note.text, note.mode === 'demo' ? 'tag tag-demo' : 'muted'));

  if (input.status === 'idle') {
    section.append(make('p', '앱을 골라 접속을 요청하세요.'), make('p', '요청하기 전에는 판정이 없습니다.', 'muted'));
  } else if (input.status === 'loading') {
    section.append(make('p', '판정 확인 중'));
    if (appText) section.append(make('p', appText, 'muted'));
  } else if (input.status === 'error') {
    const error = isObject(input.error) ? input.error : {};
    const message = isText(error.message) ? error.message : '서버가 사유를 알려 주지 않았습니다.';
    const contract = CONTRACT_ERROR_CODES.includes(error.code);
    section.append(make('p', `${contract ? '확인 불가' : '요청 실패'}: ${message}`));
    if (appText) section.append(make('p', appText, 'muted'));
    section.append(make('p', contract
      ? '서버 응답 형식을 확인할 수 없습니다. 접근 거부 판정이 아니며, 접근 가능 여부를 알 수 없습니다.'
      : '이것은 접근 거부 판정이 아닙니다. 판정을 받지 못해 접근 가능 여부를 알 수 없습니다. 필요하면 직접 다시 요청하세요.', 'muted'));
  } else if (input.status === 'ok') {
    const result = decisionResult(input);
    if (result.unverified) {
      section.append(make('p', `확인 불가: ${result.unverified}`), make('p', '접근 거부 판정이 아니며, 접근 가능 여부를 알 수 없습니다.', 'muted'));
      return section;
    }
    const info = DECISION[result.code];
    const heading = make('p');
    heading.append(make('strong', `${info.label}(${result.code})`));
    section.append(heading);
    if (isText(result.data.appId)) section.append(make('p', `앱 ${result.data.appId}`, 'muted'));
    section.append(make('p', info.note));
    if (!result.known) section.append(make('p', `서버가 알 수 없는 판정 값을 보냈습니다: ${isText(result.raw) ? result.raw.slice(0, 40) : '값 없음'}`, 'muted'));
    const list = make('dl');
    list.append(
      make('dt', '판정 이유'), make('dd', isText(result.data.reason) ? result.data.reason : '이유 정보 없음'),
      make('dt', '판정 시각'), make('dd', checkedAtText(result.data.checkedAt)),
    );
    section.append(list);
  } else {
    section.append(make('p', '확인 불가: 알 수 없는 상태입니다. 접근 가능 여부를 알 수 없습니다.'));
  }
  return section;
}

export function createStudentView() {
  return {
    renderIdentity(input) { return identityView(input); },
    renderDecision(input) { return decisionView(input); },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
