-- Ablauftest Spielfeld (läuft nach _wowmock.lua und allen Addon-Dateien, siehe _uitest.js):
-- ganze Partien gegen die CPU, der Mensch spielt über die Oberfläche (Klicks auf Karten, Menüs, Ziele, Entscheidungen).
-- GAMES (global) = Anzahl Partien, Standard 1
local ns = __NS
local E = ns.E
local out, errs = {}, {}
local function check(c, msg) out[#out + 1] = (c and "OK   " or "FAIL ") .. msg end

__fire("ADDON_LOADED", "WoWTCG"); __fire("PLAYER_LOGIN")
local UI = ns.UI
check(UI.frame ~= nil, "UI aufgebaut")
E.AI_BUDGET.normal = 200            -- schneller rechnen (fengari)
local db = ns.GetDB()
db.cpuFast = true

local function btns() return UI.CardButtons() end
local function findBtn(f) for _, b in ipairs(btns()) do if b:IsShown() and b.ref and f(b) then return b end end end
local function click(b, m) UI.CardClick(b, m or "LeftButton") end
local function press(x) x._scripts.OnClick(x) end
local stats = { play = 0, res = 0, attack = 0, power = 0, quest = 0, board = 0, choose = 0, pass = 0, prioCard = 0, direct = 0, confirm = 0, menu = 0 }

local function humanStep(s)
    if UI.animLock then return end                                         -- Angriffs-Animation abwarten
    if UI.confirm:IsShown() then press(UI.confirm.yes); stats.confirm = stats.confirm + 1 return end
    if UI.mull:IsShown() then UI.FinishMulligan(math.random() < 0.4) return end
    local d = s.pending
    if d and d.pid == 1 then
        if d.kind == "priority" then
            local c = UI.modal.cards[1]
            if math.random() < 0.35 and UI.modal:IsShown() and c and c:IsShown() then c._scripts.OnClick(c); stats.prioCard = stats.prioCard + 1 return end
            UI.Act({ type = "PASS" }); stats.pass = stats.pass + 1 return
        end
        local v = E.aiPick(s, d)
        if UI.boardMode then
            local b = findBtn(function(b) return b.card and b.card.uid == v end)
            if b then
                click(b)
                if d.destroy and s.pending == d and UI.aim.btns[1] and UI.aim.btns[1]:IsShown() then press(UI.aim.btns[1]) end
                stats.board = stats.board + 1
                return
            end
        end
        UI.Choose(v); stats.choose = stats.choose + 1
        return
    end
    if UI.busy or s.activePlayer ~= 1 or not E.isIdle(s) then return end
    local dec = E.fastAiAction(s, 1)
    local a = dec and dec.action
    if not a or a.type == "END_TURN" then UI.EndTurn() return end
    local hand = function(b) return b.ref.zone == "hand" and b.ref.idx == a.handIdx end
    if a.type == "PLAY_CARD" and not a.gyUid then
        local b = findBtn(hand) if b then click(b); stats.play = stats.play + 1 return end
    elseif a.type == "PLACE_RESOURCE" then
        local b = findBtn(hand)
        if b then
            local n = #s.p1.hand
            click(b, "RightButton"); stats.res = stats.res + 1
            -- Rückgängig einmal prüfen
            if not UI._undoTested and UI.CanUndo() then
                UI._undoTested = true
                UI.Undo()
                check(#UI.game.p1.hand == n, "Rückgängig: Ressource zurück auf die Hand")
            end
            return
        end
    elseif a.type == "COMPLETE_QUEST" then
        local b = findBtn(function(b) return b.ref.zone == "res" and b.ref.pid == 1 and b.ref.idx == a.resIdx end)
        if b then click(b); stats.quest = stats.quest + 1 return end
    elseif a.type == "ATTACK" then
        local b = findBtn(function(b) return b.card and b.card.uid == a.attackerUid and b.ref.pid == 1 end)
        if b then
            click(b)
            if UI.menu:IsShown() then stats.menu = stats.menu + 1 for _, x in ipairs(UI.menu.btns) do if x:IsShown() and x.kind == "danger" then press(x) break end end end
            local t = findBtn(function(x) return x.card and x.card.uid == a.defenderUid end)
            if t and UI.attacker then click(t); stats.attack = stats.attack + 1 return end
        end
    elseif a.type == "ACTIVATE" then
        local b = findBtn(function(b) return b.card and b.card.uid == a.srcUid and b.ref.pid == 1 end)
        if b then
            local pw = E.getPower(s, b.card, a.key)
            click(b)
            if UI.menu:IsShown() then
                stats.menu = stats.menu + 1
                for _, x in ipairs(UI.menu.btns) do if x:IsShown() and x.kind ~= "danger" then press(x) break end end
            end
            stats.power = stats.power + 1
            return
        end
    end
    UI.Act(a); stats.direct = stats.direct + 1
end

local N = GAMES or 1
-- DUMP_TURN: nur eine Partie bis zu diesem Zug spielen und das Spielfeld als JSON ausgeben (Layout-Vorschau im Browser)
local function q(s)
    s = tostring(s or ""):gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\r", ""):gsub("\n", "\\n")
    return '"' .. s .. '"'
end
function __dump()
    local items = {}
    for _, b in ipairs(UI.CardButtons()) do
        if b:IsShown() and b._pt and b._pt[2] == UI.board then
            local t = { "\"x\":" .. b._pt[4], "\"y\":" .. (-b._pt[5]), "\"w\":" .. (b._w or 0), "\"h\":" .. (b._h or 0), "\"lvl\":" .. (b._lvl or 0),
                "\"id\":" .. ((b.card and b.card.id) or 0), "\"tex\":" .. q(b.art._shown and b.art._tex or ""), "\"rot\":" .. tostring(b.fxRot and true or false),
                "\"atk\":" .. q(b.atkB._shown and b.atkB.txt._text or ""), "\"hp\":" .. q(b.hpB._shown and b.hpB.txt._text or ""), "\"dim\":" .. tostring(b.shade._shown and true or false),
                "\"glow\":" .. ((b.glow and b.glow._alpha) or 0), "\"tag\":" .. q(b.tag._text), "\"cap\":" .. q(b.cap._text), "\"name\":" .. q(b.name._text) }
            items[#items + 1] = "{" .. table.concat(t, ",") .. "}"
        end
    end
    local txt = { "\"turn\":" .. q(UI.turnText._text), "\"info1\":" .. q(UI.info1._text), "\"info2\":" .. q(UI.info2._text), "\"badge\":" .. q(UI.turnBadge._text),
        "\"res1\":" .. q(UI.resInfo[1].b.txt._text), "\"res2\":" .. q(UI.resInfo[2].b.txt._text), "\"hp1\":" .. q(UI.hp[1].num._text), "\"hp2\":" .. q(UI.hp[2].num._text),
        "\"hpf1\":" .. (UI.hp[1].fill._h or 0), "\"hpf2\":" .. (UI.hp[2].fill._h or 0), "\"log\":" .. q(table.concat(UI.log._msgs or {}, "\n")), "\"chain\":" .. q(UI.chainBox._shown and UI.chainText._text or "") }
    return "{\"cards\":[" .. table.concat(items, ",") .. "]," .. table.concat(txt, ",") .. "}"
end
local wins, turns, timeouts = 0, 0, 0
for g = 1, N do
    UI.StartGame()
    check(UI.mull:IsShown(), "Spiel " .. g .. ": Mulligan-Fenster offen")
    local guard, lastSig, same = 0, nil, 0
    while not UI.game.gameOver and guard < 4000 do
        guard = guard + 1
        local s = UI.game
        local ok, err = pcall(humanStep, s)
        if not ok then errs[#errs + 1] = "Mensch: " .. tostring(err) break end
        __tick(0.25)
        -- Fortschritt prüfen: gleicher Zustand zu oft -> Zug beenden / passen
        local sig = s.turn .. "|" .. #s.p1.hand .. "|" .. #s.p2.hand .. "|" .. s.p1.hero.damage .. "|" .. s.p2.hero.damage .. "|" .. #s.chain .. "|" .. tostring(s.pending and s.pending.kind) .. "|" .. tostring(UI.busy)
        if sig == lastSig then same = same + 1 else same = 0 end
        lastSig = sig
        if same > 25 then
            if not UI.busy then
                if s.pending and s.pending.pid == 1 then E.autoResolve(s) else UI.EndTurn() end
                UI.Render()
            end
            if same > 200 then errs[#errs + 1] = "hängt: " .. sig .. " busy=" .. tostring(UI.busy) .. " idle=" .. tostring(E.isIdle(s)) .. " win=" .. tostring(s.win and s.win.prio) break end
        end
        if s.turn > 70 then timeouts = timeouts + 1 break end
        if DUMP_TURN and s.turn >= DUMP_TURN and s.activePlayer == 1 and E.isIdle(s) and not UI.busy and not UI.mulliganing then UI.Render() return __dump() end
    end
    local s = UI.game
    if s.gameOver then
        if s.winner == 1 then wins = wins + 1 end
        check(UI.over:IsShown(), "Spiel " .. g .. ": Ende-Fenster sichtbar (Sieger " .. tostring(s.winner) .. ", Zug " .. s.turn .. ")")
    end
    turns = turns + s.turn
end
for _, m in ipairs(__chat) do if m:find("Fehler") or m:find("error") then errs[#errs + 1] = "Chat: " .. m end end
check(#errs == 0, "keine Fehler")
local st = {}
for k, v in pairs(stats) do st[#st + 1] = k .. "=" .. v end
table.sort(st)
out[#out + 1] = string.format("Partien %d, Siege Mensch(KI-Klicks) %d, Züge Ø %.1f, abgebrochen %d", N, wins, turns / N, timeouts)
out[#out + 1] = "Klicks: " .. table.concat(st, " ")
for i = 1, math.min(8, #errs) do out[#out + 1] = "ERR " .. errs[i] end
return table.concat(out, "\n")
