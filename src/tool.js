/*! Eretek Online Araçlar #26 — DMARC Aggregate Rapor Görüntüleyici */
ERT.def('26', {
	run: function (v, c) {
		var src = v.file && v.file.data ? v.file.data : v.xml;
		if (!src || !String(src).trim()) { throw c.fe('xml', 'req'); }
		if (String(src).length > 20 * 1048576) { throw c.fe('xml', 'size', { n: 20 }); }
		var X = ERT.xml, doc;
		try { doc = X.parse(src); } catch (e) { throw c.fe('xml', e.message === 'doctype' ? 'doctype' : 'badXml'); }
		var fb = X.deep(doc, 'feedback')[0];
		if (!fb) { throw c.fe('xml', 'noFb'); }
		var md = X.find(fb, 'report_metadata'), pp = X.find(fb, 'policy_published');
		var kv = [[c.t('org'), X.txt(md, 'org_name') || '–'], [c.t('rid'), X.txt(md, 'report_id') || '–']];
		var b = X.txt(md, 'date_range/begin'), e2 = X.txt(md, 'date_range/end');
		if (b) { kv.push([c.t('range'), new Date(+b * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' – ' + new Date(+e2 * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC']); }
		kv.push([c.t('pol'), 'domain=' + X.txt(pp, 'domain') + ' p=' + X.txt(pp, 'p') + (X.txt(pp, 'sp') ? ' sp=' + X.txt(pp, 'sp') : '') + ' pct=' + (X.txt(pp, 'pct') || '100') + ' adkim=' + (X.txt(pp, 'adkim') || 'r') + ' aspf=' + (X.txt(pp, 'aspf') || 'r')]);
		var agg = {}, total = 0, pass = 0;
		X.all(fb, 'record').forEach(function (r) {
			var row = X.find(r, 'row'), ip = X.txt(row, 'source_ip'), n = parseInt(X.txt(row, 'count'), 10) || 0;
			var ev = X.find(row, 'policy_evaluated'), disp = X.txt(ev, 'disposition'), dk = X.txt(ev, 'dkim'), sp = X.txt(ev, 'spf');
			var hf = X.txt(r, 'identifiers/header_from');
			var ad = X.all(X.find(r, 'auth_results'), 'dkim').map(function (x) { return X.txt(x, 'domain') + ':' + X.txt(x, 'result'); }).join(' ');
			var as = X.all(X.find(r, 'auth_results'), 'spf').map(function (x) { return X.txt(x, 'domain') + ':' + X.txt(x, 'result'); }).join(' ');
			var k = [ip, hf, disp, dk, sp, ad, as].join('|');
			if (!agg[k]) { agg[k] = { ip: ip, hf: hf, disp: disp, dk: dk, sp: sp, ad: ad, as: as, n: 0 }; }
			agg[k].n += n; total += n; if (dk === 'pass' || sp === 'pass') { pass += n; }
		});
		var rows = Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, z) { return z.n - a.n; }).map(function (a) { return [a.ip, a.n, a.hf, a.disp, a.dk, a.sp, a.ad || '–', a.as || '–']; });
		var cls = rows.map(function (r) { return r[4] === 'pass' || r[5] === 'pass' ? 'ok' : 'warn'; });
		kv.push([c.t('msgs'), c.n(total, 0)], [c.t('aligned'), total ? c.pct(pass / total) : '–']);
		var cols = [c.t('c_ip'), c.t('c_n'), 'header_from', c.t('c_disp'), c.t('c_dk'), c.t('c_sp'), c.t('c_ad'), c.t('c_as')];
		var byIp = {}; rows.forEach(function (r) { byIp[r[0]] = (byIp[r[0]] || 0) + r[1]; });
		return { big: c.t('big', { n: c.n(total, 0), r: rows.length }), kv: kv, msgs: [['info', c.t('evalNote')]], tables: [{ cols: cols, rows: rows, cls: cls }], x: { csv: { name: 'dmarc-aggregate', cols: cols, rows: rows } }, v: { total: total, byIp: byIp } };
	}
});
