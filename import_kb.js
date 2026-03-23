"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var fs = require("fs");
var path = require("path");
// Parse CSV manually handling quotes
function parseCSVRow(text) {
    var result = [];
    var currentString = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
        var char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                currentString += '"';
                i++; // skip next quote
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === ',' && !inQuotes) {
            result.push(currentString);
            currentString = '';
        }
        else {
            currentString += char;
        }
    }
    result.push(currentString);
    return result;
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var envPath, envContent, supabaseUrl, supabaseKey, supabase, csvPath, fileContent, lines, dataLines, validRows, batchSize, currentBatch, delError, i, row, moduleName, question, answer, error, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    envPath = path.join(__dirname, '.env.local');
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, 'utf8');
                        envContent.split(/\r?\n/).forEach(function (line) {
                            var match = line.match(/^([^=]+)=(.*)$/);
                            if (match) {
                                var val = match[2].trim();
                                if (val.startsWith('"') && val.endsWith('"')) {
                                    val = val.slice(1, -1);
                                }
                                process.env[match[1]] = val;
                            }
                        });
                    }
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseKey) {
                        console.error("Missing Supabase URL or Key");
                        process.exit(1);
                    }
                    supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
                    csvPath = path.join(__dirname, 'neohos_qa_knowledge_base.csv');
                    fileContent = fs.readFileSync(csvPath, 'utf8');
                    lines = fileContent.replace(/\r/g, '').split('\n').filter(function (line) { return line.trim().length > 0; });
                    dataLines = lines.slice(1);
                    console.log("Found ".concat(dataLines.length, " rows to import..."));
                    validRows = 0;
                    batchSize = 100;
                    currentBatch = [];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 2:
                    delError = (_d.sent()).error;
                    console.log('Cleared table for fresh import');
                    i = 0;
                    _d.label = 3;
                case 3:
                    if (!(i < dataLines.length)) return [3 /*break*/, 6];
                    row = parseCSVRow(dataLines[i]);
                    if (row.length < 4)
                        return [3 /*break*/, 5];
                    moduleName = ((_a = row[1]) === null || _a === void 0 ? void 0 : _a.trim()) || 'General';
                    question = (_b = row[2]) === null || _b === void 0 ? void 0 : _b.trim();
                    answer = (_c = row[3]) === null || _c === void 0 ? void 0 : _c.trim();
                    if (!question || !answer)
                        return [3 /*break*/, 5];
                    // Truncate title to 255 chars
                    if (question.length > 250)
                        question = question.substring(0, 250) + '...';
                    if (moduleName.length > 250)
                        moduleName = moduleName.substring(0, 250);
                    currentBatch.push({
                        title: question,
                        content: answer,
                        category: moduleName,
                        tags: [moduleName]
                    });
                    validRows++;
                    if (!(currentBatch.length >= batchSize || i === dataLines.length - 1)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase.from('knowledge_base').insert(currentBatch)];
                case 4:
                    error = (_d.sent()).error;
                    if (error) {
                        console.error("Error inserting batch at row ".concat(i, ":"), error.message);
                    }
                    else {
                        console.log("Successfully inserted batch. Total inserted so far: ".concat(validRows));
                    }
                    currentBatch = [];
                    _d.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("\nImport complete! Processed ".concat(validRows, " valid Q&A entries."));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _d.sent();
                    console.error("Fatal error during import:", error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
main();
