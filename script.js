document.addEventListener("DOMContentLoaded", () => {
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const modal = document.getElementById('questionModal');
    const questionText = document.getElementById('questionText');
    const answerInput = document.getElementById('answerInput');
    const submitButton = document.getElementById('submitAnswer');
    const notification = document.getElementById('notification');
    const timeUpModal = document.getElementById('timeUpModal');
    const finalScoreElement = document.getElementById('finalScore');

    let score = 0;
    let totalTime = 60;
    let startTime;
    let completedTasks = [];
    let currentMarkerIndex = 0;
    let isTimeUp = false; // Sürenin dolup dolmadığını kontrol etmek için

    // Global değişkenler
    let currentCorrectAnswer = ''; // Mevcut doğru cevap
    let currentOnSuccess = null;   // Mevcut başarı fonksiyonu
    let map; // Haritayı global hale getirdik

    const markers = [
        { coords: [39.925533, 32.866287], popup: 'Görev 1: 3 + 2 = ?', correctAnswer: '5' },
        { coords: [39.925533, 35.866287], popup: 'Görev 2: Türkiye\'nin başkenti nedir?', correctAnswer: 'ankara' },
        { coords: [39.925533, 38.866287], popup: 'Görev 3: Gezilerini Seyahatname adlı eserde toplayan Türk gezgin kimdir?', correctAnswer: 'evliya çelebi' },
        { coords: [39.925533, 41.866287], popup: 'Görev 4: Duvara asılı bir haritanın sağı her zaman hangi yönü gösterir?', correctAnswer: 'doğu' },
        { coords: [41.000000, 34.366287], popup: 'Görev 5: Gülü ile meşhur olan ilimiz hangisidir?', correctAnswer: 'ısparta' },
        { coords: [41.000000, 37.432574], popup: 'Görev 6: Türkiye\'de kaç tane coğrafi bölge bulunmaktadır?', correctAnswer: '7' },
        { coords: [41.000000, 40.432574], popup: 'Görev 7: İtalya\'nın başkenti neresidir?', correctAnswer: 'roma' },
        { coords: [35.800000, 37.432574], popup: 'Görev 8: Hacettepe Harita Mühendisliği\'nin ilk adı ne mühendisliğiydi?', correctAnswer: 'geomatik' }
    ];

    const connections = [
        { from: 0, to: 1 },
        { from: 0, to: 7 },
        { from: 0, to: 4 },
        { from: 1, to: [4, 5, 2, 7] },
        { from: 2, to: [5, 6, 7] },
        { from: 3, to: [2, 6, 7] },
        { from: 4, to: 5 },
        { from: 5, to: 6 }
    ];

    function startTimer() {
        startTime = Date.now();
        let elapsedTime = 0;

        const timer = setInterval(() => {
            const now = Date.now();
            const delta = Math.floor((now - startTime) / 1000) - elapsedTime;
            elapsedTime += delta;
            const remainingTime = totalTime - elapsedTime;

            if (remainingTime <= 0) {
                clearInterval(timer);
                timerElement.textContent = `Süre: 0`;
                isTimeUp = true; // Sürenin dolduğunu işaretle

                // Mevcut modal penceresini kapat
                modal.style.display = 'none';

                // Süre doldu modali göster
                showTimeUpModal();

                // Haritadaki tüm markerları etkisiz hale getir
                disableAllMarkers();

            } else {
                timerElement.textContent = `Süre: ${remainingTime}`;
            }
        }, 1000);
    }

    function showTimeUpModal() {
        const finalShape = prompt("Son bir kez şekli tahmin et: (Örnek: kare, üçgen, elmas, vb.)");
        if (finalShape && finalShape.toLowerCase() === "elmas") {
            finalScoreElement.textContent = `${score} - Doğru şekli tahmin ettiniz: Elmas`;
        } else {
            finalScoreElement.textContent = `${score} - Yanlış şekil tahmini! Doğru cevap: Elmas`;
        }
        timeUpModal.style.display = 'block';
    }

    function disableAllMarkers() {
        // Tüm markerların tıklanmasını engelle
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                layer.off('click');
            }
        });
    }

    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `show ${type}`;

        setTimeout(() => {
            notification.className = '';
        }, 2000);
    }

    function askForShapeGuess() {
        const shapeGuess = prompt("Şekli tahmin et: (Örnek: kare, üçgen, elmas, vb.)");
        if (shapeGuess) {
            if (shapeGuess.toLowerCase() === "elmas") {
                showNotification("Tebrikler! Doğru şekli tahmin ettiniz: Elmas", "success");
            } else {
                showNotification(`Yanlış tahmin: ${shapeGuess}. Tekrar deneyebilirsiniz!`, "error");
            }
        }
    }

    function drawConnections(map) {
        connections.forEach(connection => {
            const fromCoords = markers[connection.from].coords;
            const toIndices = Array.isArray(connection.to) ? connection.to : [connection.to];

            toIndices.forEach(toIndex => {
                const toCoords = markers[toIndex].coords;
                if (completedTasks.includes(connection.from) && completedTasks.includes(toIndex)) {
                    L.polyline([fromCoords, toCoords], { color: 'blue', weight: 3 }).addTo(map);
                }
            });
        });
    }

    function addMarker(index, map) {
        const markerData = markers[index];
        const marker = L.marker(markerData.coords).addTo(map)
            .bindPopup(markerData.popup)
            .openPopup();

        marker.on('click', () => {
            if (isTimeUp) return; // Süre dolduysa işlem yapma

            showQuestionModal(markerData.popup, markerData.correctAnswer, () => {
                map.removeLayer(marker);
                completedTasks.push(index);
                drawConnections(map);
                // Burada currentMarkerIndex artırmıyoruz
                if ([2, 4, 6].includes(index)) {
                    askForShapeGuess();
                }
            });
        });
        return marker; // Marker'ı döndürüyoruz
    }

    function showQuestionModal(question, correctAnswer, onSuccess) {
        if (isTimeUp) return; // Süre dolduysa modalı gösterme

        questionText.textContent = question;
        modal.style.display = 'block';

        // Mevcut doğru cevabı ve başarı fonksiyonunu global değişkenlere atayın
        currentCorrectAnswer = correctAnswer;
        currentOnSuccess = onSuccess;

        // Cevap alanını temizleyin ve odaklanın
        answerInput.value = '';
        answerInput.focus();
    }

    // Olay dinleyicilerini sadece bir kez ekleyin
    submitButton.addEventListener('click', handleAnswer);
    answerInput.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Varsayılan davranışı engelle
            handleAnswer();
        }
    });

    function handleAnswer() {
        if (isTimeUp) return; // Süre dolduysa işlem yapma

        const userAnswer = answerInput.value.trim().toLowerCase();
        console.log(`Kullanıcı cevabı: "${userAnswer}"`); // Debugging için

        // Mevcut doğru cevap tanımlı mı kontrol edin
        if (!currentCorrectAnswer) {
            return;
        }

        if (userAnswer === currentCorrectAnswer.toLowerCase()) {
            showNotification('Doğru cevap!', 'success');
            score += 10;
            scoreElement.textContent = `Skor: ${score}`;
            modal.style.display = 'none';

            if (currentOnSuccess) {
                currentOnSuccess(); // Başarı fonksiyonunu çağır
            }

            // Global değişkenleri sıfırlayın
            currentCorrectAnswer = '';
            currentOnSuccess = null;

            // Süre dolmadıysa bir sonraki soruyu otomatik olarak aç
            if (!isTimeUp) {
                currentMarkerIndex++;
                if (currentMarkerIndex < markers.length) {
                    const nextMarker = addMarker(currentMarkerIndex, map);
                    // Bir sonraki markere otomatik tıklama simülasyonu
                    nextMarker.fire('click');
                } else {
                    showNotification(`Tüm görevleri tamamladınız! Skorunuz: ${score}`, 'success');
                }
            }
        } else {
            showNotification('Yanlış cevap, tekrar deneyin.', 'error');
            answerInput.value = ''; // Cevap alanını temizle
            answerInput.focus(); // Tekrar odaklan
        }
    }

    function startGame() {
        map = L.map('map').setView([39.925533, 32.866287], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const firstMarker = addMarker(currentMarkerIndex, map);
        firstMarker.fire('click'); // İlk soruyu otomatik olarak açıyoruz
        startTimer();
    }

    startGame();
});