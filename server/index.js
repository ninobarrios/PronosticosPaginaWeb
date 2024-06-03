require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());

app.use(cors({
    origin: 'https://ninobarrios.github.io/PronosticosIABetBook/' // Reemplaza 'http://example.com' con el dominio de tu aplicación en el celular
  }));



  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectTimeout: 100000, // 10 segundos (o el tiempo que consideres necesario)
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});

// Ahora puedes utilizar 'connection' para realizar consultas a la base de datos


// Ruta para probar la conexión a la base de datos
app.get("/test-db-connection", (req, res) => {
    // Realiza una consulta simple a la base de datos
    connection.query("SELECT 1 + 1 AS result", (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        // Devuelve el resultado de la consulta
        res.json({ result: results[0].result });
    });
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


app.get("/pronosticos", (req, res) => {
    connection.query("SELECT local, goles_local, goles_visita, visita, fecha, pronostico, resultado FROM pronosticos WHERE fecha < CURRENT_DATE() AND goles_local IS NOT NULL AND goles_visita IS NOT NULL ORDER BY fecha DESC;", (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ message: 'No hay datos disponibles' });
            return;
        }
        res.json(results);
    });
});

app.get("/pronosticosactual", (req, res) => {
    connection.query("SELECT local, visita, fecha, pronostico FROM pronosticos WHERE fecha >= CURRENT_DATE() ORDER BY fecha, local DESC;    ", (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ message: 'No hay datos disponibles' });
            return;
        }
        res.json(results);
    });
});


app.get("/rendimiento", (req, res) => {
    connection.query("SELECT fecha, COUNT(resultado) AS total_resultados, SUM(resultado) AS suma_resultados, ROUND((SUM(resultado) * 100) / COUNT(resultado), 1) AS porcentaje_resultado FROM pronosticos WHERE fecha < CURDATE() GROUP BY fecha ORDER BY fecha DESC;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});

app.get("/rendimientoxfecha/:fecha", (req, res) => {
    const fecha = req.params.fecha; // Obtener la fecha del parámetro en la URL
    connection.query("SELECT local, goles_local, goles_visita, visita, fecha, pronostico, resultado FROM `pronosticos` WHERE fecha = ?",
        [fecha],
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles para la fecha proporcionada' });
                return;
            }
            res.json(results);
        });
});


app.get("/empates", (req, res) => {
    connection.query("SELECT `local`, `visita`, `fecha`, `cuota` FROM `empates` order by fecha DESC;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});


app.get("/progresoempates", (req, res) => {
    connection.query("SELECT fecha, SUM(progreso_diario) OVER (ORDER BY fecha) AS acumulado_progresivo FROM ( SELECT fecha, SUM(progreso) AS progreso_diario FROM empates WHERE fecha < CURRENT_DATE GROUP BY fecha ) subquery ORDER BY fecha;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});



app.get("/rendimientoxfecha", (req, res) => {
    connection.query("SELECT fecha, COUNT(*) AS num_elementos, SUM(progreso) AS progreso_diario, (SELECT SUM(progreso) FROM empates e2 WHERE e2.fecha <= e1.fecha ) AS sumatoria_acumulada FROM empates e1 WHERE fecha < CURRENT_DATE GROUP BY fecha ORDER BY fecha DESC;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});
app.get("/rendimientoxfechaempate/:fecha", (req, res) => {
    const fecha = req.params.fecha; // Obtener la fecha del parámetro en la URL
    connection.query("SELECT local,  visita, fecha, resultado,cuota FROM `empates` WHERE fecha = ?",
        [fecha],
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles para la fecha proporcionada' });
                return;
            }
            res.json(results);
        });
});


app.get("/calculostake/:stake", (req, res) => {
    const stake = req.params.stake;
    
    connection.query("SELECT SUM(progreso) AS totalProgreso, COUNT(DISTINCT fecha) AS diasDiferentes FROM empates;", (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        if (results.length === 0 || results[0].totalProgreso === null) {
            res.status(404).json({ message: 'No hay datos disponibles' });
            return;
        }
        const sumProgreso = results[0].totalProgreso;
        const diasDiferentes = results[0].diasDiferentes;
        const total = sumProgreso * stake;
        res.json({ total, diasDiferentes }); // Asegúrate de que la respuesta incluye diasDiferentes
    });
});


app.get("/combinadas", (req, res) => {
    connection.query("SELECT `local`, `visita`, `fecha`,  `cuota`, `combinacion`,`resultados` FROM `combinadas` ORDER BY `fecha` DESC, `combinacion` ASC;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});



app.get("/progresocombinadas", (req, res) => {
    connection.query("SELECT fecha, COUNT(DISTINCT combinacion) AS cantidad_combinaciones, ROUND(SUM(progreso_ganancia), 2) AS suma_progreso_ganancia, ROUND(SUM(SUM(progreso_ganancia)) OVER (ORDER BY fecha), 2) AS suma_acumulada_progreso_ganancia FROM ( SELECT fecha, combinacion, CASE WHEN SUM(CASE WHEN resultados = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN EXP(SUM(LOG(cuota)))-1 ELSE (COUNT(DISTINCT combinacion)) * -1 END AS progreso_ganancia FROM combinadas GROUP BY fecha, combinacion ) AS subconsulta WHERE fecha < CURRENT_DATE GROUP BY fecha;",
        (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            if (results.length === 0) {
                res.status(404).json({ message: 'No hay datos disponibles' });
                return;
            }
            res.json(results);
        });
});

